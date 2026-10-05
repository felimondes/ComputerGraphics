import { loopSubdivision } from "../subdivision.js";
import { Shape } from "./shape.js";

export class Sphere extends Shape {
    constructor(subdivisions = 5, colors = [[1, 1, 1, 1]]) {
        super();


        const tetrahedron = this.createTetrahedron();
        const mesh = loopSubdivision(
            tetrahedron.points,
            tetrahedron.indices,
            subdivisions
        );

        this.points = mesh.positions;
        this.positions = new Float32Array(
            this.points.flatMap(position => [
                position[0], position[1], position[2], 1,
            ])
        );
        this.normals = new Float32Array(
            this.createNormals(this.points).flatMap(normal => [
                normal[0], normal[1], normal[2], 0,
            ])
        );
        this.indices = mesh.indices;
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

    createNormals(positions) {
        return positions.map(position => {
            const length = Math.hypot(position[0], position[1], position[2]) || 1;
            return vec3(
                position[0] / length,
                position[1] / length,
                position[2] / length
            );
        });
    }

    createColors(positions, colors) {
        const colorList = colors.length ? colors : [[1, 1, 1, 1]];
        return positions.map((_, index) => {
            const c = colorList[index % colorList.length];
            return vec4(c[0], c[1], c[2], c[3] ?? 1);
        });
    }

    getBoundingRadius() {
        return 1;
    }

    isSubdivisble() {
        return true;
    }
}