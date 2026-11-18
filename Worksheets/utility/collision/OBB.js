import { principalComponents } from "../linalg.js";

const EPSILON = 1e-6;

export function multiplyTransforms(a, b) {
    const result = [];
    for (let i = 0; i < 3; i++) {
        result[i] = [];
        for (let j = 0; j < 4; j++) {
            result[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] +
                a[i][2] * b[2][j] + (j === 3 ? a[i][3] : 0);
        }
    }
    result.push([0, 0, 0, 1]);
    return result;
}

function inverseTransform(matrix) {
    const [a, b, c] = matrix[0];
    const [d, e, f] = matrix[1];
    const [g, h, i] = matrix[2];
    const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    if (det === 0 || !Number.isFinite(det)) return null;
    const inverse = [
        [(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det],
        [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
        [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det],
    ];
    for (let row = 0; row < 3; row++) {
        inverse[row][3] = -inverse[row][0] * matrix[0][3] -
            inverse[row][1] * matrix[1][3] - inverse[row][2] * matrix[2][3];
    }
    inverse.push([0, 0, 0, 1]);
    return inverse;
}

function boxFromTransform(matrix, extents) {
    const directions = [
        [matrix[0][0], matrix[1][0], matrix[2][0]],
        [matrix[0][1], matrix[1][1], matrix[2][1]],
        [matrix[0][2], matrix[1][2], matrix[2][2]],
    ];
    return {
        center: [matrix[0][3], matrix[1][3], matrix[2][3]],
        directions,
        extents,
        normals: [
            cross(directions[1], directions[2]),
            cross(directions[2], directions[0]),
            cross(directions[0], directions[1]),
        ],
    };
}

function separatedOnAxis(a, b, axis, inverseA) {
    const lengthSquared = dot(axis, axis);
    if (lengthSquared === 0) return false;
    let radius = 0;
    for (let i = 0; i < 3; i++) {
        radius += a.extents[i] * Math.abs(dot(a.directions[i], axis));
        radius += b.extents[i] * Math.abs(dot(b.directions[i], axis));
    }
    const [x, y, z] = axis;
    const distance = Math.abs(dot(subtract(b.center, a.center), axis));
    const tolerance = inverseA
        ? EPSILON * Math.hypot(
            inverseA[0][0] * x + inverseA[1][0] * y + inverseA[2][0] * z,
            inverseA[0][1] * x + inverseA[1][1] * y + inverseA[2][1] * z,
            inverseA[0][2] * x + inverseA[1][2] * y + inverseA[2][2] * z
        )
        : EPSILON * Math.sqrt(lengthSquared);
    return distance > radius + tolerance;
}

export class OBB {
    constructor(center, axes, extents) {
        this.center = center;
        this.axes = axes;
        this.extents = extents;
    }

    static fromPoints(positions) {
        const { mean, axes } = principalComponents(positions);
        const min = [Infinity, Infinity, Infinity];
        const max = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < positions.length; i += 4) {
            const point = subtract([positions[i], positions[i + 1], positions[i + 2]], mean);
            for (let axis = 0; axis < 3; axis++) {
                const projection = dot(point, axes[axis]);
                min[axis] = Math.min(min[axis], projection);
                max[axis] = Math.max(max[axis], projection);
            }
        }
        const center = [...mean];
        const extents = [];
        for (let axis = 0; axis < 3; axis++) {
            extents.push((max[axis] - min[axis]) / 2);
            const midpoint = (max[axis] + min[axis]) / 2;
            for (let i = 0; i < 3; i++) center[i] += axes[axis][i] * midpoint;
        }
        return new OBB(center, axes, extents);
    }

    getTransform() {
        return [
            [this.axes[0][0], this.axes[1][0], this.axes[2][0], this.center[0]],
            [this.axes[0][1], this.axes[1][1], this.axes[2][1], this.center[1]],
            [this.axes[0][2], this.axes[1][2], this.axes[2][2], this.center[2]],
            [0, 0, 0, 1],
        ];
    }

    static testOverlap(obbA, matrixA, obbB, matrixB) {
        return OBB.testTransformedOverlap(
            obbA, multiplyTransforms(matrixA, obbA.getTransform()),
            obbB, multiplyTransforms(matrixB, obbB.getTransform())
        );
    }

    static testTransformedOverlap(obbA, matrixA, obbB, matrixB) {
        const inverseA = inverseTransform(matrixA);
        // Singular object scales cannot be inverted; test those boxes in world space.
        const a = boxFromTransform(inverseA ? [
            [1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1],
        ] : matrixA, obbA.extents);
        const b = boxFromTransform(inverseA ? multiplyTransforms(inverseA, matrixB) : matrixB, obbB.extents);
        for (let i = 0; i < 3; i++) {
            if (separatedOnAxis(a, b, a.normals[i], inverseA) ||
                separatedOnAxis(a, b, b.normals[i], inverseA)) return false;
        }
        for (const directionA of a.directions) {
            for (const directionB of b.directions) {
                if (separatedOnAxis(a, b, cross(directionA, directionB), inverseA)) return false;
            }
        }
        return true;
    }
}
