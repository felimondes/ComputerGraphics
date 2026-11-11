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
        this.boundingBox = this.calculateBoundingBox();
        this.boundingRadius = this.calculateBoundingRadius();
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

    getBoundingRadius() {
        return this.boundingRadius;
    }

    calculateBoundingBox() {
        const positions = this.getPositions();
        if (positions.length === 0 || positions.length % 4 !== 0) {
            throw new Error("OBJ positions must contain vec4 data to calculate bounds.");
        }

        const min = [Infinity, Infinity, Infinity];
        const max = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < positions.length; i += 4) {
            for (let axis = 0; axis < 3; axis++) {
                const value = positions[i + axis];
                if (!Number.isFinite(value)) {
                    throw new Error("OBJ positions must be finite to calculate bounds.");
                }
                min[axis] = Math.min(min[axis], value);
                max[axis] = Math.max(max[axis], value);
            }
        }

        return { min, max };
    }

    getBoundingBox() {
        return this.boundingBox;
    }

    calculateBoundingRadius() {
        const { min, max } = this.getBoundingBox();
        const center = min.map((value, axis) => (value + max[axis]) / 2);
        const positions = this.getPositions();
        let radiusSquared = 0;

        for (let i = 0; i < positions.length; i += 4) {
            const dx = positions[i] - center[0];
            const dy = positions[i + 1] - center[1];
            const dz = positions[i + 2] - center[2];
            radiusSquared = Math.max(
                radiusSquared,
                dx * dx + dy * dy + dz * dz
            );
        }

        return Math.sqrt(radiusSquared);
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