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
    constructor(positions, indices, maxTrianglesPerLeaf = 4) {
        this.positions = positions;
        this.indices = indices;
        this.maxTrianglesPerLeaf = maxTrianglesPerLeaf;
        this.root = this.build(Array.from({ length: indices.length / 3 }, (_, i) => i));
    }

    build(triangleIndices) {
        if (triangleIndices.length === 0) {
            throw new Error("Cannot build OBBTree with zero triangles.");
        }

        const trianglePositions = this.extractTrianglePositions(triangleIndices);
        const obb = OBB.fromPoints(trianglePositions);

        if (
            triangleIndices.length <= this.maxTrianglesPerLeaf ||
            !this.canSplit(triangleIndices)
        ) {
            return new OBBNode(obb, triangleIndices);
        }

        const [left, right] = this.split(triangleIndices, obb);
        if (left.length === 0 || right.length === 0) {
            return new OBBNode(obb, triangleIndices);
        }

        const leftNode = this.build(left);
        const rightNode = this.build(right);

        const node = new OBBNode(obb, null, [leftNode, rightNode]);
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

    canSplit(triangleIndices) {
        return triangleIndices.length > 1;
    }

    split(triangleIndices, obb) {
        for (let axisIndex = 0; axisIndex < 3; axisIndex++) {
            const axis = obb.axes[axisIndex];
            let sum = 0;
            for (const triIndex of triangleIndices) {
                const centerPos = this.getTriangleCenter(triIndex);
                const diff = [
                    centerPos[0] - obb.center[0],
                    centerPos[1] - obb.center[1],
                    centerPos[2] - obb.center[2],
                ];
                sum += diff[0] * axis[0] + diff[1] * axis[1] + diff[2] * axis[2];
            }
            const threshold = sum / triangleIndices.length;

            const left = [];
            const right = [];
            for (const triIndex of triangleIndices) {
                const centerPos = this.getTriangleCenter(triIndex);
                const diff = [
                    centerPos[0] - obb.center[0],
                    centerPos[1] - obb.center[1],
                    centerPos[2] - obb.center[2],
                ];
                const proj = diff[0] * axis[0] + diff[1] * axis[1] + diff[2] * axis[2];
                if (proj < threshold) {
                    left.push(triIndex);
                } else {
                    right.push(triIndex);
                }
            }

            if (left.length > 0 && right.length > 0) {
                return [left, right];
            }
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
