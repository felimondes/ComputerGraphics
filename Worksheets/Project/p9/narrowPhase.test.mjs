import test from "node:test";
import assert from "node:assert/strict";
import { OBBTree } from "./obbTree.js";
import { markSATCollisions } from "./narrowPhase.js";

const identity = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
];

function object(points, matrix = identity) {
    const positions = new Float32Array(points.flatMap(point => [...point, 1]));
    const indices = points.map((_, index) => index);
    return { obbTree: new OBBTree(positions, indices), getM: () => matrix };
}

function collides(a, b) {
    return markSATCollisions([a, b], [{ objects: [a, b] }]).length > 0;
}

const triangle = [[0, 0, 0], [2, 0, 0], [0, 2, 0]];

test("separates coplanar triangles despite overlapping bounding boxes", () => {
    const a = object(triangle);
    const b = object([[2, 2, 0], [2, 0.9, 0], [0.9, 2, 0]]);
    assert.equal(collides(a, b), false);
    assert.equal(a.isColliding, false);
    assert.equal(b.isColliding, false);
});

test("detects coplanar intersection and boundary contact", () => {
    assert.equal(collides(object(triangle), object([[1, 0, 0], [3, 0, 0], [1, 1, 0]])), true);
    assert.equal(collides(object(triangle), object([[2, 0, 0], [3, 0, 0], [2, 1, 0]])), true);
});

test("uses object transforms in the tree and triangle tests", () => {
    const transform = [
        [0, -2, 0, 2],
        [1, 0, 0, 0],
        [0, 0, 0.5, 0],
        [0, 0, 0, 1],
    ];
    const a = object(triangle);
    const b = object(triangle, transform);
    assert.equal(collides(a, b), true);
    transform[0][3] = 10;
    assert.equal(collides(a, b), false);
    transform[0][3] = 2;
    transform[2][3] = 1;
    assert.equal(collides(a, b), false);
});

test("detects intersection between non-coplanar triangles", () => {
    const b = object([[0.5, 0.5, -1], [0.5, 0.5, 1], [1.5, 0.5, 0]]);
    assert.equal(collides(object(triangle), b), true);
});

test("handles degenerate segments and points", () => {
    const segment = [[0, 0, 0], [2, 2, 0], [1, 1, 0]];
    assert.equal(collides(object(segment), object([[1, 1, 0], [1, 1, 0], [1, 1, 0]])), true);
    assert.equal(collides(object(segment), object([[1, 1.5, 0], [1, 1.5, 0], [1, 1.5, 0]])), false);
});

test("fits every tree level with orthogonal axes enclosing its triangles", () => {
    const points = [
        ...triangle, [3, 0, 0], [4, 0, 0], [3, 1, 0],
        [0, 3, 0], [1, 3, 0], [0, 4, 0], [3, 3, 0], [4, 3, 0], [3, 4, 0],
        [5, 0, 0], [6, 0, 0], [5, 1, 0],
    ];
    const a = object(points);
    markSATCollisions([a], []);
    function check(node) {
        const obb = node.obb;
        const dot = (x, y) => x.reduce((sum, value, i) => sum + value * y[i], 0);
        assert.ok(Math.abs(dot(obb.axes[0], obb.axes[1])) < 1e-10);
        assert.ok(Math.abs(dot(obb.axes[0], obb.axes[2])) < 1e-10);
        assert.ok(Math.abs(dot(obb.axes[1], obb.axes[2])) < 1e-10);
        const indices = node.isLeaf() ? node.triangleIndices : node.children.flatMap(check);
        for (const index of indices) {
            for (let vertex = 0; vertex < 3; vertex++) {
                const point = points[index * 3 + vertex];
                const relative = point.map((value, i) => value - obb.center[i]);
                for (let axis = 0; axis < 3; axis++) {
                    assert.ok(Math.abs(dot(relative, obb.axes[axis])) <= obb.extents[axis] + 1e-6);
                }
            }
        }
        return indices;
    }
    check(a.obbTree.root);
});

test("reuses each object's transform within a collision update", () => {
    const a = object(triangle);
    const b = object(triangle);
    const c = object(triangle);
    let calls = 0;
    a.getM = () => { calls++; return identity; };
    const pairs = [{ objects: [a, b] }, { objects: [a, c] }];
    assert.equal(markSATCollisions([a, b, c], pairs).length, 2);
    assert.equal(calls, 1);
    assert.equal(a.isColliding, true);
});

test("tree pruning agrees with brute-force triangle checks for rotated, scaled meshes", () => {
    const points = [];
    for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 3; y++) {
            points.push([x, y, 0], [x + 0.6, y, 0], [x, y + 0.6, 0]);
        }
    }
    const treeA = object(points);
    const treeB = object(points);
    const bruteA = object(points);
    const bruteB = object(points);
    for (const item of [bruteA, bruteB]) {
        item.obbTree.root.children = null;
        item.obbTree.root.triangleIndices = Array.from({ length: points.length / 3 }, (_, i) => i);
    }
    for (let i = 0; i < 40; i++) {
        const angle = i * 0.37;
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const matrix = [
            [c * 1.3, -s * 0.7, 0, (i % 7) - 2],
            [s * 1.3, c * 0.7, 0, (i % 5) - 2],
            [0, 0, 1, i % 4 === 0 ? 0.1 : 0],
            [0, 0, 0, 1],
        ];
        treeB.getM = () => matrix;
        bruteB.getM = () => matrix;
        assert.equal(collides(treeA, treeB), collides(bruteA, bruteB), `pose ${i}`);
    }
});

test("splits by longest box extent and falls back when that axis cannot divide", () => {
    const points = [
        [-1, -3, 0], [-1, -3, 0], [-1, -3, 0],
        [1, -3, 0], [1, -3, 0], [1, -3, 0],
        [-1, 3, 0], [-1, 3, 0], [-1, 3, 0],
        [1, 3, 0], [1, 3, 0], [1, 3, 0],
    ];
    const tree = object(points).obbTree;
    const obb = { axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], extents: [1, 10, 0] };
    assert.deepEqual(tree.split([0, 1, 2, 3], obb), [[0, 1], [2, 3]]);
    obb.extents = [10, 1, 0];
    assert.deepEqual(tree.split([0, 1], obb), [[0], [1]]);
    obb.extents = [1, 10, 0];
    assert.deepEqual(tree.split([0, 1], obb), [[0], [1]]);
});

test("places the split plane at the mean vertex projection", () => {
    const points = [0, 10, 49, 100].flatMap(x => [[x, 0, 0], [x, 0, 0], [x, 0, 0]]);
    const tree = object(points).obbTree;
    const obb = { axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], extents: [50, 0, 0] };
    assert.deepEqual(tree.split([0, 1, 2, 3], obb), [[0, 1], [2, 3]]);
});

test("subdivides to individual triangles except when all centers coincide", () => {
    const points = [
        ...triangle,
        [3, 0, 0], [4, 0, 0], [3, 1, 0],
        [6, 0, 0], [7, 0, 0], [6, 1, 0],
        [9, 0, 0], [10, 0, 0], [9, 1, 0],
    ];
    const tree = object(points).obbTree;
    assert.equal(tree.getAllNodes().filter(node => node.isLeaf()).length, 4);
    assert.ok(tree.getAllNodes().filter(node => node.isLeaf()).every(node => node.triangleIndices.length === 1));
    const sameCenter = object([...triangle, ...triangle]).obbTree;
    assert.equal(sameCenter.root.isLeaf(), true);
    assert.equal(sameCenter.root.triangleIndices.length, 2);
});

test("parent-relative transforms reconstruct each box in object coordinates", () => {
    const points = [
        ...triangle,
        [3, 0, 1], [4, 0, 1], [3, 1, 1],
        [0, 3, 2], [1, 3, 2], [0, 4, 2],
        [3, 3, 3], [4, 3, 3], [3, 4, 3],
    ];
    const tree = object(points).obbTree;
    const multiply = (a, b) => a.map(row => b[0].map((_, column) =>
        row.reduce((sum, value, i) => sum + value * b[i][column], 0)));
    function check(node, parentTransform) {
        const transform = multiply(parentTransform, node.localTransform);
        for (let row = 0; row < 3; row++) {
            assert.ok(Math.abs(transform[row][3] - node.obb.center[row]) < 1e-10);
            for (let column = 0; column < 3; column++) {
                assert.ok(Math.abs(transform[row][column] - node.obb.axes[column][row]) < 1e-10);
            }
        }
        if (node.children) node.children.forEach(child => check(child, transform));
    }
    check(tree.root, identity);
});

test("keeps local tree transforms unchanged while objects move", () => {
    const a = object([...triangle, [3, 0, 0], [4, 0, 0], [3, 1, 0]]);
    const b = object(triangle);
    const nodes = a.obbTree.getAllNodes();
    const transforms = nodes.map(node => JSON.stringify(node.localTransform));
    const originalRoot = a.obbTree.root;
    collides(a, b);
    a.getM = () => [[0, -1, 0, 2], [1, 0, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
    collides(a, b);
    assert.equal(a.obbTree.root, originalRoot);
    assert.deepEqual(nodes.map(node => JSON.stringify(node.localTransform)), transforms);
});

test("handles a singular object scale without losing a real collision", () => {
    const flat = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 1]];
    assert.equal(collides(object(triangle, flat), object(triangle)), true);
    assert.equal(collides(object(triangle, flat), object([[4, 0, 0], [5, 0, 0], [4, 1, 0]])), false);
});

test("3D tree pruning agrees with brute-force checks under affine transforms", () => {
    let seed = 42;
    function random() {
        seed = (1664525 * seed + 1013904223) >>> 0;
        return seed / 0x100000000;
    }
    const points = Array.from({ length: 36 }, () =>
        [random() * 2 - 1, random() * 2 - 1, random() * 2 - 1]);
    const treeA = object(points);
    const treeB = object(points);
    const bruteA = object(points);
    const bruteB = object(points);
    for (const item of [bruteA, bruteB]) {
        item.obbTree.root.children = null;
        item.obbTree.root.triangleIndices = Array.from({ length: points.length / 3 }, (_, i) => i);
    }
    for (let i = 0; i < 80; i++) {
        const angle = random() * 2 * Math.PI;
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const matrix = [
            [c * 1.3, -s * 0.7, 0.2, random() * 4 - 2],
            [s * 1.3, c * 0.7, 0.1, random() * 4 - 2],
            [0, 0, 0.8, random() * 4 - 2],
            [0, 0, 0, 1],
        ];
        treeB.getM = () => matrix;
        bruteB.getM = () => matrix;
        assert.equal(collides(treeA, treeB), collides(bruteA, bruteB), `pose ${i}`);
    }
});
