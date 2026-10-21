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
        
        this.mesh = mesh;
        this.colorPalette = colors;
        
        this._points = this.createPoints(mesh.positions);
        this._positions = this.createPositions();
        this._normals = this.createNormals();
        this._indices = this.createIndices();
        this._colors = this.createColors();
    }

    
    createPoints(position) {
        return (
            position.flatMap(point => [
                vec4(point[0], point[1], point[2], 1),
            ])
        );
    }

    createPositions() {
        return new Float32Array(
            this._points.flatMap(position => [
                position[0], position[1], position[2], 1,
            ])
        );
    }

    createIndices() {
        return this.mesh.indices;
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

    createNormals() {
        return new Float32Array(
            this._points.flatMap(position => {
            const length = Math.hypot(position[0], position[1], position[2]) || 1;
                return [
                    position[0] / length,
                    position[1] / length,
                    position[2] / length,
                    0,
                ];
            })
        );
    }

    createColors() {
        const colorList = this.colorPalette.length
            ? this.colorPalette
            : [[1, 1, 1, 1]];
        return this._points.map((_, index) => {
            const c = colorList[index % colorList.length];
            return vec4(c[0], c[1], c[2], c[3] ?? 1);
        });
    }

    getCenter() {
        return this.getCenterFromPositions();
    }

    getBoundingRadius() {
        return 1;
    }

    isSubdivisble() {
        return true;
    }
}