import { readOBJFile } from "./OBJParser.js";
import { Shape } from "./shape.js";
export class OBJShape extends Shape {
    constructor(obj) {
        super();

        this.positions = obj.vertices;
        this.indices = obj.indices;
        this.colors = obj.colors;
        this.normals = obj.normals;

        this.boundingRadius = this.calculateBoundingRadius(
            this.positions
        );
    }

    static async fromFile(url) {
        const obj = await readOBJFile(url, 1.0, false);

        if (!obj) {
            throw new Error(`Failed to parse OBJ: ${url}`);
        }

        return new OBJShape(obj);
    }


    calculateBoundingRadius(vertices) {
        let radiusSquared = 0;

        for (let i = 0; i < vertices.length; i += 4) {
            const x = vertices[i];
            const y = vertices[i + 1];
            const z = vertices[i + 2];

            radiusSquared = Math.max(
                radiusSquared,
                x * x + y * y + z * z
            );
        }

        return Math.sqrt(radiusSquared);
    }

    getBoundingRadius() {
        return this.boundingRadius;
    }

    isSubdivisble() {
        return false;
    }
}