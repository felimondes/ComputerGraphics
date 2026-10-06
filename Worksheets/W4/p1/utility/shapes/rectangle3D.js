import { Shape } from "./shape.js";

export class Rectangle3D extends Shape {
    constructor(colors) {
        super();
        this.positions = this.createShape();
        this.colors = this.createColors(colors);
        this.indices = this.createTriangles();
    }

    createColors(colors = []) {
        if (colors.length === 0) {
            throw new Error("Rectangle3D requires at least one color.");
        }

        return this.positions.map((_, index) => colors[index % colors.length]);
    }

    createShape() {
        return [
            vec3(0, 0, 0), // 0
            vec3(0, 1, 0), // 1
            vec3(1, 1, 0), // 2
            vec3(1, 0, 0), // 3
            vec3(0, 0, 1), // 4
            vec3(0, 1, 1), // 5
            vec3(1, 1, 1), // 6
            vec3(1, 0, 1)  // 7
        ];
    }

    createTriangles() {
        return new Uint32Array([
            // Front face
            0, 1, 2,
            0, 2, 3,

            // Back face
            4, 6, 5,
            4, 7, 6,

            // Left face
            0, 4, 5,
            0, 5, 1,

            // Right face
            3, 2, 6,
            3, 6, 7,

            // Top face
            1, 5, 6,
            1, 6, 2,

            // Bottom face
            0, 3, 7,
            0, 7, 4
        ]);
    }

    getBoundingRadius() {
        return Math.sqrt(3) / 2;
    }
}