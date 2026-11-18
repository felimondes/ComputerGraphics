import { OBB, multiplyTransforms } from "./OBB.js";

function getNodeTransform(node, context) {
    let matrix = context.transforms.get(node);
    if (!matrix) {
        const parent = node.parent ? getNodeTransform(node.parent, context) : context.matrix;
        matrix = multiplyTransforms(parent, node.localTransform);
        context.transforms.set(node, matrix);
    }
    return matrix;
}

export function testOBBNodesCollision(nodeA, nodeB, a, b, testLeaves) {
    if (!OBB.testTransformedOverlap(
        nodeA.obb, getNodeTransform(nodeA, a),
        nodeB.obb, getNodeTransform(nodeB, b)
    )) {
        return false;
    }

    if (nodeA.isLeaf() && nodeB.isLeaf()) {
        return testLeaves(nodeA, nodeB, a, b);
    }

    if (!nodeA.isLeaf() && !nodeB.isLeaf()) {
        for (const childA of nodeA.children) {
            for (const childB of nodeB.children) {
                if (testOBBNodesCollision(childA, childB, a, b, testLeaves)) return true;
            }
        }
        return false;
    }
    if (!nodeA.isLeaf()) {
        return nodeA.children.some(child => testOBBNodesCollision(child, nodeB, a, b, testLeaves));
    }
    return nodeB.children.some(child => testOBBNodesCollision(nodeA, child, a, b, testLeaves));
}
