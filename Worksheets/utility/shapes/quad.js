import { Shape } from "./shape.js";

export class Quad extends Shape {
    constructor(aspectRatio = 1) {
        super();
        if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
            throw new RangeError("Quad aspect ratio must be a positive finite number.");
        }

        const halfWidth = aspectRatio >= 1 ? 1 : aspectRatio;
        const halfHeight = aspectRatio >= 1 ? 1 / aspectRatio : 1;
        this._positions = new Float32Array([
            -halfWidth, -halfHeight, 0, 1,
            halfWidth, -halfHeight, 0, 1,
            halfWidth, halfHeight, 0, 1,
            -halfWidth, halfHeight, 0, 1,
        ]);
        this._normals = new Float32Array([
            0, 0, 1, 0,
            0, 0, 1, 0,
            0, 0, 1, 0,
            0, 0, 1, 0,
        ]);
        this._indices = new Uint32Array([0, 1, 2, 0, 2, 3]);
    }

    getCenter() {
        return vec3(0, 0, 0);
    }

    isSubdivisble() {
        return false;
    }
}
