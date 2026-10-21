import { Shape } from "./shape.js";

export class Rectangle extends Shape {
    constructor(pointList) {
        super();

        if (!Array.isArray(pointList) || pointList.length !== 4) {
            throw new Error("Rectangle requires exactly four corner points.");
        }

        this.pointList = pointList;
        this._positions = this.createPositions();
        this._normals = this.createNormals();
        this._indices = this.createIndices();
        this._colors = this.createColors();
    }

    createPositions() {
        return flatten(this.pointList);
    }

    createNormals() {
        const [a, b, , d] = this.pointList;
        const normal = normalize(cross(subtract(b, a), subtract(d, a)));
        const normal4 = vec4(normal[0], normal[1], normal[2], 0);

        return flatten(this.pointList.map(() => normal4));
    }

    createIndices() {
        return new Uint32Array([0, 1, 2, 0, 2, 3]);
    }

    createColors() {
        return this.pointList.map(() => vec4(1, 1, 1, 1));
    }

    getTextureCoordinates() {
        return new Float32Array([
            -1.5, 0.0,
             2.5, 0.0,
             2.5, 10.0,
            -1.5, 10.0,
        ]);
    }

    getCenter() {
        return this.getCenterFromPositions();
    }

    getBoundingRadius() {
        return ""
    }

    isSubdivisble() {
        return false;
    }
}