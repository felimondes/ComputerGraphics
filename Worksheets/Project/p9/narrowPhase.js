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
        if (testOBBNodesCollision(a.tree.root, b.tree.root, a, b)) {
            first.isColliding = true;
            second.isColliding = true;
            collidingPairs.push(pair);
        }
    }
    return collidingPairs;
}

function transformPoint(matrix, x, y, z) {
    return [
        matrix[0][0] * x + matrix[0][1] * y + matrix[0][2] * z + matrix[0][3],
        matrix[1][0] * x + matrix[1][1] * y + matrix[1][2] * z + matrix[1][3],
        matrix[2][0] * x + matrix[2][1] * y + matrix[2][2] * z + matrix[2][3],
    ];
}

function cross(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ];
}

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function dotAxis(vector, x, y, z) {
    return vector[0] * x + vector[1] * y + vector[2] * z;
}

function separatedOnCrossAxis(test, a, b, first, second) {
    return test(a, b,
        first[1] * second[2] - first[2] * second[1],
        first[2] * second[0] - first[0] * second[2],
        first[0] * second[1] - first[1] * second[0]
    );
}

function multiplyTransforms(a, b) {
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

function getNodeTransform(node, context) {
    let matrix = context.transforms.get(node);
    if (!matrix) {
        const parent = node.parent ? getNodeTransform(node.parent, context) : context.matrix;
        matrix = multiplyTransforms(parent, node.localTransform);
        context.transforms.set(node, matrix);
    }
    return matrix;
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

function boxesSeparatedOnAxis(a, b, x, y, z, inverseA) {
    const lengthSquared = x * x + y * y + z * z;
    if (lengthSquared === 0) {
        return false;
    }
    let radius = 0;
    for (let i = 0; i < 3; i++) {
        radius += a.extents[i] * Math.abs(dotAxis(a.directions[i], x, y, z));
        radius += b.extents[i] * Math.abs(dotAxis(b.directions[i], x, y, z));
    }
    const distance = Math.abs(
        (b.center[0] - a.center[0]) * x +
        (b.center[1] - a.center[1]) * y +
        (b.center[2] - a.center[2]) * z
    );
    const tolerance = inverseA
        ? EPSILON * Math.hypot(
            inverseA[0][0] * x + inverseA[1][0] * y + inverseA[2][0] * z,
            inverseA[0][1] * x + inverseA[1][1] * y + inverseA[2][1] * z,
            inverseA[0][2] * x + inverseA[1][2] * y + inverseA[2][2] * z
        )
        : EPSILON * Math.sqrt(lengthSquared);
    return distance > radius + tolerance;
}

function boxesOverlap(nodeA, nodeB, contextA, contextB) {
    const matrixA = getNodeTransform(nodeA, contextA);
    const matrixB = getNodeTransform(nodeB, contextB);
    const inverseA = inverseTransform(matrixA);
    // Singular object scales cannot be inverted; test those boxes in world space.
    const a = boxFromTransform(inverseA ? [
        [1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1],
    ] : matrixA, nodeA.obb.extents);
    const b = boxFromTransform(inverseA ? multiplyTransforms(inverseA, matrixB) : matrixB, nodeB.obb.extents);
    for (let i = 0; i < 3; i++) {
        if (boxesSeparatedOnAxis(a, b, ...a.normals[i], inverseA) ||
            boxesSeparatedOnAxis(a, b, ...b.normals[i], inverseA)) {
            return false;
        }
    }
    for (const directionA of a.directions) {
        for (const directionB of b.directions) {
            const axis = cross(directionA, directionB);
            if (boxesSeparatedOnAxis(a, b, ...axis, inverseA)) {
                return false;
            }
        }
    }
    return true;
}

function testOBBNodesCollision(nodeA, nodeB, a, b) {
    if (!boxesOverlap(nodeA, nodeB, a, b)) {
        return false;
    }

    if (nodeA.isLeaf() && nodeB.isLeaf()) {
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

    if (!nodeA.isLeaf() && !nodeB.isLeaf()) {
        for (const childA of nodeA.children) {
            for (const childB of nodeB.children) {
                if (testOBBNodesCollision(childA, childB, a, b)) return true;
            }
        }
        return false;
    }
    if (!nodeA.isLeaf()) {
        return nodeA.children.some(child => testOBBNodesCollision(child, nodeB, a, b));
    }
    return nodeB.children.some(child => testOBBNodesCollision(nodeA, child, a, b));
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
        const edges = vertices.map((vertex, i) => {
            const next = vertices[(i + 1) % 3];
            return [next[0] - vertex[0], next[1] - vertex[1], next[2] - vertex[2]];
        });
        triangle = { vertices, edges, normal: cross(edges[0], edges[1]) };
        context.triangles.set(index, triangle);
    }
    return triangle;
}

function trianglesSeparatedOnAxis(a, b, x, y, z) {
    const lengthSquared = x * x + y * y + z * z;
    if (lengthSquared === 0) {
        return false;
    }
    const a0 = dotAxis(a.vertices[0], x, y, z);
    const a1 = dotAxis(a.vertices[1], x, y, z);
    const a2 = dotAxis(a.vertices[2], x, y, z);
    const b0 = dotAxis(b.vertices[0], x, y, z);
    const b1 = dotAxis(b.vertices[1], x, y, z);
    const b2 = dotAxis(b.vertices[2], x, y, z);
    const tolerance = EPSILON * Math.sqrt(lengthSquared);
    return Math.max(a0, a1, a2) < Math.min(b0, b1, b2) - tolerance ||
        Math.max(b0, b1, b2) < Math.min(a0, a1, a2) - tolerance;
}

function trianglesOverlap(a, b) {
    if (trianglesSeparatedOnAxis(a, b, ...a.normal) ||
        trianglesSeparatedOnAxis(a, b, ...b.normal)) {
        return false;
    }

    for (const edgeA of a.edges) {
        for (const edgeB of b.edges) {
            if (separatedOnCrossAxis(trianglesSeparatedOnAxis, a, b, edgeA, edgeB)) {
                return false;
            }
        }
    }

    // Coplanar triangles also need in-plane edge normals.
    for (const edge of a.edges) {
        if (separatedOnCrossAxis(trianglesSeparatedOnAxis, a, b, a.normal, edge)) return false;
    }
    for (const edge of b.edges) {
        if (separatedOnCrossAxis(trianglesSeparatedOnAxis, a, b, b.normal, edge)) return false;
    }

    // Degenerate triangles can represent segments or points rather than surfaces.
    if (dot(a.normal, a.normal) === 0 || dot(b.normal, b.normal) === 0) {
        const basis = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
        for (const axis of basis) {
            if (trianglesSeparatedOnAxis(a, b, ...axis)) return false;
            for (const edge of [...a.edges, ...b.edges]) {
                if (trianglesSeparatedOnAxis(a, b, ...edge) ||
                    separatedOnCrossAxis(trianglesSeparatedOnAxis, a, b, edge, axis)) return false;
            }
        }
    }
    return true;
}
