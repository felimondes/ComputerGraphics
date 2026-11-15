import { readOBJFile } from "./OBJParser.js";
import { Shape } from "./shape.js";
export class OBJShape extends Shape {
    constructor(obj) {
        super();

        this.obj = obj;
        this._positions = this.createPositions();
        this._normals = this.createNormals();
        this._indices = this.createIndices();
        this._colors = this.createColors();
    }
    
    createPositions() {
        return this.obj.vertices;
    }

    createNormals() {
        return this.obj.normals;
    }

    createIndices() {
        return this.obj.indices;
    }

    createColors() {
        return this.obj.colors;
    }

    getCenter() {
        return this.getCenterFromPositions();
    }

    static async fromFile(url) {
        const obj = await readOBJFile(url, 1.0, false);

        if (!obj) {
            throw new Error(`Failed to parse OBJ: ${url}`);
        }

        return new OBJShape(obj);
    }


    isSubdivisble() {
        return false;
    }
}