import { testOBBNodesCollision } from "./midPhase.js";

const EPSILON = 1e-6;

export function markSATCollisions(objects, candidatePairs) {
    const contexts = new Map();
    for (const object of objects) {
        object.isColliding = false;
    }

    const collidingPairs = [];
    for (const pair of candidatePairs) {
        const [first, second] = pair.objects;
        if (!first.obbTree || !second.obbTree) {
            continue;
        }

        for (const object of [first, second]) {
            if (!contexts.has(object)) {
                contexts.set(object, {
                    tree: object.obbTree,
                    matrix: object.getM(),
                    transforms: new Map(),
                    triangles: new Map(),
                });
            }
        }
        const a = contexts.get(first);
        const b = contexts.get(second);
        if (testOBBNodesCollision(a.tree.root, b.tree.root, a, b, testLeafTriangles)) {
            first.isColliding = true;
            second.isColliding = true;
            collidingPairs.push(pair);
        }
    }
    return collidingPairs;
}

function transformPoint(matrix, x, y, z) {
    const point = [x, y, z, 1];
    return [
        dot(matrix[0], point),
        dot(matrix[1], point),
        dot(matrix[2], point),
    ];
}

function testLeafTriangles(nodeA, nodeB, a, b) {
    for (const indexA of nodeA.triangleIndices) {
        const triangleA = getWorldTriangle(indexA, a);
        for (const indexB of nodeB.triangleIndices) {
            if (trianglesOverlap(triangleA, getWorldTriangle(indexB, b))) {
                return true;
            }
        }
    }
    return false;
}

function getWorldTriangle(index, context) {
    let triangle = context.triangles.get(index);
    if (!triangle) {
        const vertices = [];
        for (let i = 0; i < 3; i++) {
            const offset = context.tree.indices[index * 3 + i] * 4;
            const positions = context.tree.positions;
            vertices.push(transformPoint(
                context.matrix, positions[offset], positions[offset + 1], positions[offset + 2]
            ));
        }
        const edges = vertices.map((vertex, i) => subtract(vertices[(i + 1) % 3], vertex));
        triangle = { vertices, edges, normal: cross(edges[0], edges[1]) };
        context.triangles.set(index, triangle);
    }
    return triangle;
}

function trianglesSeparatedOnAxis(a, b, axis) {
    const lengthSquared = dot(axis, axis);
    if (lengthSquared === 0) {
        return false;
    }
    const a0 = dot(a.vertices[0], axis);
    const a1 = dot(a.vertices[1], axis);
    const a2 = dot(a.vertices[2], axis);
    const b0 = dot(b.vertices[0], axis);
    const b1 = dot(b.vertices[1], axis);
    const b2 = dot(b.vertices[2], axis);
    const tolerance = EPSILON * Math.sqrt(lengthSquared);
    return Math.max(a0, a1, a2) < Math.min(b0, b1, b2) - tolerance ||
        Math.max(b0, b1, b2) < Math.min(a0, a1, a2) - tolerance;
}

function trianglesOverlap(a, b) {
    if (trianglesSeparatedOnAxis(a, b, a.normal) ||
        trianglesSeparatedOnAxis(a, b, b.normal)) {
        return false;
    }

    for (const edgeA of a.edges) {
        for (const edgeB of b.edges) {
            if (trianglesSeparatedOnAxis(a, b, cross(edgeA, edgeB))) {
                return false;
            }
        }
    }

    for (const edge of a.edges) {
        if (trianglesSeparatedOnAxis(a, b, cross(a.normal, edge))) return false;
    }
    for (const edge of b.edges) {
        if (trianglesSeparatedOnAxis(a, b, cross(b.normal, edge))) return false;
    }

    if (dot(a.normal, a.normal) === 0 || dot(b.normal, b.normal) === 0) {
        const basis = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
        for (const axis of basis) {
            if (trianglesSeparatedOnAxis(a, b, axis)) return false;
            for (const edge of [...a.edges, ...b.edges]) {
                if (trianglesSeparatedOnAxis(a, b, edge) ||
                    trianglesSeparatedOnAxis(a, b, cross(edge, axis))) return false;
            }
        }
    }
    return true;
}
