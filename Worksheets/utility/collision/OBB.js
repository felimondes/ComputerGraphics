import { principalComponents } from "../linalg.js";

export class OBB {
    constructor(center, axes, extents) {
        this.center = center;
        this.axes = axes;
        this.extents = extents;
    }

    static fromPoints(positions) {
        if (positions.length % 4 !== 0 || positions.length === 0) {
            throw new Error("Points must be vec4 positions.");
        }

        const count = positions.length / 4;
        const mean = [0, 0, 0];
        for (let i = 0; i < count; i++) {
            for (let c = 0; c < 3; c++) {
                mean[c] += positions[i * 4 + c] / count;
            }
        }

        const { axes, eigenvalues } = principalComponents(positions, mean);

        const projections = [[], [], []];
        for (let i = 0; i < count; i++) {
            const p = [
                positions[i * 4],
                positions[i * 4 + 1],
                positions[i * 4 + 2],
            ];
            const diff = [p[0] - mean[0], p[1] - mean[1], p[2] - mean[2]];

            for (let axisIndex = 0; axisIndex < 3; axisIndex++) {
                const axis = axes[axisIndex];
                const proj = diff[0] * axis[0] + diff[1] * axis[1] + diff[2] * axis[2];
                projections[axisIndex].push(proj);
            }
        }

        // BUG FIX: Create a fresh center variable instead of mutating mean
        const center = [mean[0], mean[1], mean[2]];
        const extents = [];
        
        for (let axisIndex = 0; axisIndex < 3; axisIndex++) {
            const min = Math.min(...projections[axisIndex]);
            const max = Math.max(...projections[axisIndex]);
            const extent = (max - min) / 2;
            extents.push(extent);
            const mid = (max + min) / 2;
            const offset = axes[axisIndex].map(c => c * mid);
            center[0] += offset[0];
            center[1] += offset[1];
            center[2] += offset[2];
        }

        return new OBB(center, axes, extents);
    }

    static testOverlap(obbA, matrixA, obbB, matrixB) {
        const relativeT = SAT(obbA, obbB, matrixA, matrixB);
        return relativeT !== null;
    }
}

function SAT(obbA, obbB, matrixA, matrixB) {
    const relativeRotation = getRelativeRotation(matrixA, matrixB);
    const relativeTranslation = getRelativeTranslation(matrixA, matrixB);

    const axes = [
        ...obbA.axes,
        ...obbB.axes.map(axis => {
            const rotated = [
                axis[0] * relativeRotation[0][0] + axis[1] * relativeRotation[0][1] + axis[2] * relativeRotation[0][2],
                axis[0] * relativeRotation[1][0] + axis[1] * relativeRotation[1][1] + axis[2] * relativeRotation[1][2],
                axis[0] * relativeRotation[2][0] + axis[1] * relativeRotation[2][1] + axis[2] * relativeRotation[2][2],
            ];
            return rotated;
        }),
    ];

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const axis = [
                obbA.axes[i][1] * obbB.axes[j][2] - obbA.axes[i][2] * obbB.axes[j][1],
                obbA.axes[i][2] * obbB.axes[j][0] - obbA.axes[i][0] * obbB.axes[j][2],
                obbA.axes[i][0] * obbB.axes[j][1] - obbA.axes[i][1] * obbB.axes[j][0],
            ];
            const len = Math.sqrt(axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2]);
            if (len < 1e-6) {
                continue;
            }
            axis[0] /= len;
            axis[1] /= len;
            axis[2] /= len;
            axes.push(axis);
        }
    }

    for (const axis of axes) {
        const projA = projectBox(obbA, axis);
        const projB = projectBox(obbB, axis, relativeRotation, relativeTranslation);

        if (projA.max < projB.min - 1e-6 || projB.max < projA.min - 1e-6) {
            return null;
        }
    }

    return { rotation: relativeRotation, translation: relativeTranslation };
}

function getRelativeRotation(matrixA, matrixB) {
    const rotation = [];
    for (let i = 0; i < 3; i++) {
        rotation[i] = [];
        for (let j = 0; j < 3; j++) {
            rotation[i][j] = matrixA[i][j] * matrixB[i][j] +
                             matrixA[i][j] * matrixB[i][j] +
                             matrixA[i][j] * matrixB[i][j];
        }
    }
    return rotation;
}

function getRelativeTranslation(matrixA, matrixB) {
    return [
        matrixB[0][3] - matrixA[0][3],
        matrixB[1][3] - matrixA[1][3],
        matrixB[2][3] - matrixA[2][3],
    ];
}

function projectBox(obb, axis) {
    const projCenter = obb.center[0] * axis[0] + obb.center[1] * axis[1] + obb.center[2] * axis[2];
    let radius = 0;
    for (let i = 0; i < 3; i++) {
        const axisProj = Math.abs(
            obb.axes[i][0] * axis[0] + obb.axes[i][1] * axis[1] + obb.axes[i][2] * axis[2]
        );
        radius += obb.extents[i] * axisProj;
    }
    return { min: projCenter - radius, max: projCenter + radius };
}
