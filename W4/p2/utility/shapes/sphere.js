import { loopSubdivision } from "../subdivision.js";
import { Shape } from "./shape.js";

export class Sphere extends Shape {
    constructor(subdivisions = 5) {
        super();

        const tetrahedron = this.createTetrahedron();
        const mesh = loopSubdivision(
            tetrahedron.points,
            tetrahedron.indices,
            subdivisions
        );

        this.positions = mesh.positions;
        this.indices = mesh.indices;
        this.colors = this.createColors();
    }

    createTetrahedron() {
        return {
            points: [
                vec3(0, 0, 1),
                vec3(0, (2 * Math.sqrt(2)) / 3, -1 / 3),
                vec3(-Math.sqrt(6) / 3, -Math.sqrt(2) / 3, -1 / 3),
                vec3(Math.sqrt(6) / 3, -Math.sqrt(2) / 3, -1 / 3),
            ],
            indices: new Uint32Array([
                0, 1, 2,
                0, 3, 1,
                0, 2, 3,
                1, 3, 2,
            ]),
        };
    }

    createColors() {
        return this.positions.map((position) =>
            add(
                scale(1.0, vec4(position, 1.0)),
                vec4(0.5, 0.5, 0.5, 0.5)
            )
        );
    }

    getBoundingRadius() {
        return 1;
    }
}