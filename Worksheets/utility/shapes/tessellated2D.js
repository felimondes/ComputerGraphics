import { Shape } from "./shape.js";

const OUTER_VERTEX_COUNT = 5 ;
const INNER_RADIUS = 0.20;
const SUBDIVISION_LEVELS = 1;

export class Tessellated2D extends Shape {
    constructor() {
        super();

        const positions = [[0, 0, 0, 1]];
        for (let vertex = 0; vertex < OUTER_VERTEX_COUNT; vertex++) {
            const angle = (2 * Math.PI * vertex) / OUTER_VERTEX_COUNT;
            const radius = vertex % 2 === 0 ? 1 : INNER_RADIUS;
            positions.push([
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                0,
                1,
            ]);
        }

        let indices = [];
        for (let vertex = 0; vertex < OUTER_VERTEX_COUNT; vertex++) {
            indices.push(
                0,
                vertex + 1,
                ((vertex + 1) % OUTER_VERTEX_COUNT) + 1
            );
        }
        for (let level = 0; level < SUBDIVISION_LEVELS; level++) {
            indices = subdivideTriangles(positions, indices);
        }

        this._positions = new Float32Array(positions.flat());
        this._normals = new Float32Array(positions.length * 4);
        for (let vertex = 0; vertex < positions.length; vertex++) {
            this._normals[vertex * 4 + 2] = 1;
        }
        this._indices = new Uint32Array(indices);
    }

    getCenter() {
        return vec3(0, 0, 0);
    }

    isSubdivisble() {
        return false;
    }
}

function subdivideTriangles(positions, indices) {
    const midpointIndices = new Map();
    const subdivided = [];

    function midpointIndex(first, second) {
        const low = Math.min(first, second);
        const high = Math.max(first, second);
        const key = `${low}:${high}`;
        const existing = midpointIndices.get(key);
        if (existing !== undefined) {
            return existing;
        }

        const firstPosition = positions[first];
        const secondPosition = positions[second];
        const index = positions.length;
        positions.push([
            (firstPosition[0] + secondPosition[0]) / 2,
            (firstPosition[1] + secondPosition[1]) / 2,
            0,
            1,
        ]);
        midpointIndices.set(key, index);
        return index;
    }

    for (let index = 0; index < indices.length; index += 3) {
        const first = indices[index];
        const second = indices[index + 1];
        const third = indices[index + 2];
        const firstSecond = midpointIndex(first, second);
        const secondThird = midpointIndex(second, third);
        const thirdFirst = midpointIndex(third, first);

        subdivided.push(
            first, firstSecond, thirdFirst,
            firstSecond, second, secondThird,
            thirdFirst, secondThird, third,
            firstSecond, secondThird, thirdFirst
        );
    }

    return subdivided;
}
