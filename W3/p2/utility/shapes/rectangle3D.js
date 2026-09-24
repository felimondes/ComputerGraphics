import { Shape } from "./shape.js";

export class Rectangle3D extends Shape {
    constructor() {
        super();
        this.positions = this.createShape();
        this.indices = this.createWireframe();
    }

    createShape() {
        return [
            vec3(0, 0, 0), vec3(0, 1, 0),
            vec3(1, 1, 0), vec3(1, 0, 0),
            vec3(0, 0, 1), vec3(0, 1, 1),
            vec3(1, 1, 1), vec3(1, 0, 1)
        ];
    }

    createWireframe() {
        return new Uint32Array([
            0, 1, 1, 2, 2, 3, 3, 0,
            4, 5, 5, 6, 6, 7, 7, 4,
            0, 4, 1, 5, 2, 6, 3, 7
        ]);
    }

    getBoundingRadius() {
        return Math.sqrt(3) / 2;
    }
}