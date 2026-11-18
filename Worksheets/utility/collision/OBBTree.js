import { OBB } from "./OBB.js";

export class OBBNode {
    constructor(obb, triangleIndices = null, children = null) {
        this.obb = obb;
        this.triangleIndices = triangleIndices;
        this.children = children;
    }

    isLeaf() {
        return this.children === null;
    }
}

export class OBBTree {
    constructor(positions, indices) {
        this.positions = positions;
        this.indices = indices;
        this.root = this.build(Array.from({ length: indices.length / 3 }, (_, i) => i));
    }

    build(triangleIndices, parent = null) {
        if (triangleIndices.length === 0) {
            throw new Error("Cannot build OBBTree with zero triangles.");
        }

        const obb = OBB.fromPoints(this.extractTrianglePositions(triangleIndices));
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

    extractTrianglePositions(triangleIndices) {
        const positions = [];
        for (const triIndex of triangleIndices) {
            for (let v = 0; v < 3; v++) {
                const vertexIndex = this.indices[triIndex * 3 + v];
                for (let c = 0; c < 4; c++) {
                    positions.push(this.positions[vertexIndex * 4 + c]);
                }
            }
        }
        return new Float32Array(positions);
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

    getTriangleCenter(triIndex) {
        const center = [0, 0, 0];
        for (let v = 0; v < 3; v++) {
            const vertexIndex = this.indices[triIndex * 3 + v];
            for (let c = 0; c < 3; c++) {
                center[c] += this.positions[vertexIndex * 4 + c] / 3;
            }
        }
        return center;
    }

    getAllNodes() {
        const nodes = [];
        const traverse = (node) => {
            nodes.push(node);
            if (node.children) {
                for (const child of node.children) {
                    traverse(child);
                }
            }
        };
        traverse(this.root);
        return nodes;
    }

    getNodesAtDepth(targetDepth) {
        const nodes = [];
        const traverse = (node, depth) => {
            if (depth === targetDepth) {
                nodes.push(node);
                return;
            }
            if (node.children && depth < targetDepth) {
                for (const child of node.children) {
                    traverse(child, depth + 1);
                }
            }
        };
        traverse(this.root, 0);
        return nodes;
    }
}

function relativeTransform(obb, parent) {
    if (!parent) return obb.getTransform();
    const offset = subtract(obb.center, parent.center);
    return [
        ...parent.axes.map(axis => [
            dot(axis, obb.axes[0]), dot(axis, obb.axes[1]), dot(axis, obb.axes[2]), dot(axis, offset),
        ]),
        [0, 0, 0, 1],
    ];
}
