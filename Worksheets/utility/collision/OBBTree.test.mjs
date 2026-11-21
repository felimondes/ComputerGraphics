import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInThisContext } from "node:vm";

import { SpawningController } from "../../controls/spawning/spawning.js";
import { Quad } from "../shapes/quad.js";
import { OBBTree } from "./OBBTree.js";
import { markSATCollisions } from "./narrowPhase.js";

runInThisContext(readFileSync(new URL("../MV.js", import.meta.url), "utf8"));

function makeTree(centers) {
    const positions = [];
    const indices = [];
    for (const [x, y] of centers) {
        const first = positions.length / 4;
        positions.push(
            x - 0.1, y - 0.1, 0, 1,
            x + 0.1, y - 0.1, 0, 1,
            x, y + 0.2, 0, 1
        );
        indices.push(first, first + 1, first + 2);
    }
    return new OBBTree(new Float32Array(positions), new Uint32Array(indices));
}

test("median splits skewed triangle centers into balanced subtrees", () => {
    const tree = makeTree([[100, 0], [1, 0], [0, 0], [3, 0], [2, 0]]);
    const obb = { axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], extents: [10, 1, 0] };
    const [left, right] = tree.split([0, 1, 2, 3, 4], obb);
    assert.deepEqual(left, [2, 1]);
    assert.deepEqual(right, [4, 3, 0]);

    function countTriangles(node) {
        if (node.isLeaf()) return node.triangleIndices.length;
        const counts = node.children.map(countTriangles);
        assert.ok(Math.abs(counts[0] - counts[1]) <= 1);
        return counts[0] + counts[1];
    }
    assert.equal(countTriangles(tree.root), 5);
});

test("splitting tries shorter axes and retains coincident centers in a leaf", () => {
    const tree = makeTree([[0, -2], [0, 2], [0, 0]]);
    const obb = { axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], extents: [10, 2, 0] };
    assert.deepEqual(tree.split([0, 1, 2], obb), [[0], [2, 1]]);

    const coincident = makeTree([[0, 0], [0, 0]]);
    assert.equal(coincident.root.isLeaf(), true);
    assert.deepEqual(coincident.root.triangleIndices, [0, 1]);
});

test("shared trees keep collision transforms independent for each object", () => {
    const controller = Object.create(SpawningController.prototype);
    controller.obbTrees = new WeakMap();
    const shape = new Quad();
    const first = controller.createInitialObject(shape, { center: [0, 0, 0] });
    const second = controller.createInitialObject(shape, { center: [5, 0, 0] });
    const third = controller.createInitialObject(new Quad(), {});
    assert.equal(first.obbTree, second.obbTree);
    assert.notEqual(first.obbTree, third.obbTree);

    const pair = { objects: [first, second] };
    assert.equal(markSATCollisions([first, second], [pair]).length, 0);
    second.center = vec3(0, 0, 0);
    assert.equal(markSATCollisions([first, second], [pair]).length, 1);
    assert.equal(first.isColliding, true);
    assert.equal(second.isColliding, true);
});
