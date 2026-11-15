import { OBB } from "../../utility/collision/OBB.js";
import { OBBNode, OBBTree as BaseOBBTree } from "../../utility/collision/OBBTree.js";
import { covarianceMatrix } from "../../utility/linalg.js";

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function principalAxes(covariance) {
    const matrix = [
        covariance.slice(0, 3),
        covariance.slice(3, 6),
        covariance.slice(6, 9),
    ];
    const vectors = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    for (let iteration = 0; iteration < 32; iteration++) {
        let p = 0;
        let q = 1;
        for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) {
            if (Math.abs(matrix[i][j]) > Math.abs(matrix[p][q])) {
                p = i;
                q = j;
            }
        }
        const scale = Math.max(...matrix.map((row, i) => Math.abs(row[i])));
        if (Math.abs(matrix[p][q]) <= scale * 1e-14) break;

        const tau = (matrix[q][q] - matrix[p][p]) / (2 * matrix[p][q]);
        const t = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.hypot(1, tau));
        const c = 1 / Math.hypot(1, t);
        const s = t * c;
        const offDiagonal = matrix[p][q];
        matrix[p][p] -= t * offDiagonal;
        matrix[q][q] += t * offDiagonal;
        matrix[p][q] = matrix[q][p] = 0;
        for (let k = 0; k < 3; k++) {
            if (k !== p && k !== q) {
                const kp = matrix[k][p];
                const kq = matrix[k][q];
                matrix[k][p] = matrix[p][k] = c * kp - s * kq;
                matrix[k][q] = matrix[q][k] = s * kp + c * kq;
            }
            const vp = vectors[k][p];
            const vq = vectors[k][q];
            vectors[k][p] = c * vp - s * vq;
            vectors[k][q] = s * vp + c * vq;
        }
    }
    const axes = [0, 1, 2]
        .sort((a, b) => matrix[b][b] - matrix[a][a])
        .map(column => vectors.map(row => row[column]));
    const cross = [
        axes[0][1] * axes[1][2] - axes[0][2] * axes[1][1],
        axes[0][2] * axes[1][0] - axes[0][0] * axes[1][2],
        axes[0][0] * axes[1][1] - axes[0][1] * axes[1][0],
    ];
    if (dot(cross, axes[2]) < 0) axes[2] = axes[2].map(value => -value);
    return axes;
}

function fitBox(positions) {
    const { mean, covariance } = covarianceMatrix(positions);
    const axes = principalAxes(covariance);
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i += 4) {
        const point = [positions[i] - mean[0], positions[i + 1] - mean[1], positions[i + 2] - mean[2]];
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

function relativeTransform(obb, parent) {
    if (!parent) {
        return [
            [obb.axes[0][0], obb.axes[1][0], obb.axes[2][0], obb.center[0]],
            [obb.axes[0][1], obb.axes[1][1], obb.axes[2][1], obb.center[1]],
            [obb.axes[0][2], obb.axes[1][2], obb.axes[2][2], obb.center[2]],
            [0, 0, 0, 1],
        ];
    }
    const offset = obb.center.map((value, i) => value - parent.center[i]);
    return [
        ...parent.axes.map(axis => [
            dot(axis, obb.axes[0]), dot(axis, obb.axes[1]), dot(axis, obb.axes[2]), dot(axis, offset),
        ]),
        [0, 0, 0, 1],
    ];
}

export class OBBTree extends BaseOBBTree {
    constructor(positions, indices) {
        super(positions, indices, 1);
    }

    build(triangleIndices, parent = null) {
        if (triangleIndices.length === 0) {
            throw new Error("Cannot build OBBTree with zero triangles.");
        }
        const obb = fitBox(this.extractTrianglePositions(triangleIndices));
        const node = new OBBNode(obb, triangleIndices);
        node.parent = parent;
        node.localTransform = relativeTransform(obb, parent && parent.obb);
        if (triangleIndices.length > 1) {
            const [left, right] = this.split(triangleIndices, obb);
            if (left.length && right.length) {
                node.triangleIndices = null;
                node.children = [this.build(left, node), this.build(right, node)];
            }
        }
        return node;
    }

    split(triangleIndices, obb) {
        const centers = triangleIndices.map(index => this.getTriangleCenter(index));
        const axisOrder = [0, 1, 2].sort((a, b) => obb.extents[b] - obb.extents[a]);
        for (const axisIndex of axisOrder) {
            const axis = obb.axes[axisIndex];
            const projections = centers.map(center => dot(center, axis));
            const threshold = projections.reduce((sum, value) => sum + value, 0) / projections.length;
            const left = [];
            const right = [];
            triangleIndices.forEach((index, i) => {
                (projections[i] < threshold ? left : right).push(index);
            });
            if (left.length && right.length) return [left, right];
        }
        return [[], triangleIndices];
    }
}
