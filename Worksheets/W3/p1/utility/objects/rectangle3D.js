import { Object } from "./object.js";

export class Rectangle3D extends Object {

    constructor(center) {
        super(center);

        this.positions = this.createShape();
    }

    createShape() {
        return [
            vec3(0.0, 0.0, 0.0), // 0
            vec3(0.0, 1.0, 0.0), // 1
            vec3(1.0, 1.0, 0.0), // 2
            vec3(1.0, 0.0, 0.0), // 3

            vec3(0.0, 0.0, 1.0), // 4
            vec3(0.0, 1.0, 1.0), // 5
            vec3(1.0, 1.0, 1.0), // 6
            vec3(1.0, 0.0, 1.0)  // 7
        ];
    }

    getBoundingRadius() {
        return Math.sqrt(3) / 2;
    }
}