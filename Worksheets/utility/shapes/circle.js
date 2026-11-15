import { Shape } from "./shape.js";

export class Circle extends Shape {
    constructor(segments = 48) {
        super();
        if (!Number.isInteger(segments) || segments < 3) {
            throw new RangeError("Circle must have at least 3 segments.");
        }

        const positions = [0, 0, 0, 1];
        const normals = [0, 0, 1, 0];
        const indices = [];

        for (let segment = 0; segment < segments; segment++) {
            const angle = (2 * Math.PI * segment) / segments;
            positions.push(Math.cos(angle), Math.sin(angle), 0, 1);
            normals.push(0, 0, 1, 0);
        }

        for (let segment = 0; segment < segments; segment++) {
            const current = segment + 1;
            const next = ((segment + 1) % segments) + 1;
            indices.push(0, current, next);
        }

        this._positions = new Float32Array(positions);
        this._normals = new Float32Array(normals);
        this._indices = new Uint32Array(indices);
    }

    getCenter() {
        return vec3(0, 0, 0);
    }

    isSubdivisble() {
        return false;
    }
}
