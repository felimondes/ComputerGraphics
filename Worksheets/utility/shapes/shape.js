export class Shape {
    constructor() {
        if (new.target === Shape) {
            throw new Error(
                "Shape is an abstract class and cannot be instantiated directly."
            );
        }

    }

    createPoints() {
        throw new Error("createPoints must be implemented by the subclass.");
        
    }

    createPositions() {
        throw new Error("createPositions must be implemented by the subclass.");
    }

    createNormals() {
        throw new Error("createNormals must be implemented by the subclass.");
    }

    createIndices() {
        throw new Error("createIndices must be implemented by the subclass.");
    }

    createColors() {
        throw new Error("createColors must be implemented by the subclass.");
    }

    getPoints() {
        return this._points;
    }
    getPositions() {
        return this._positions;
    }

    getNormals() {
        return this._normals;
    }

    getIndices() {
        return this._indices;
    }

    getColors() {
        return this._colors;
    }


    getCenter() {
        throw new Error("getCenter must be implemented by the subclass.");
    }
    

    //AABB box
    getCenterFromPositions() {
        const positions = this.getPositions();
        if (positions.length === 0 || positions.length % 4 !== 0) {
            throw new Error("Shape positions must contain vec4 data.");
        }

        const min = [Infinity, Infinity, Infinity];
        const max = [-Infinity, -Infinity, -Infinity];

        for (let i = 0; i < positions.length; i += 4) {
            for (let axis = 0; axis < 3; axis++) {
                min[axis] = Math.min(min[axis], positions[i + axis]);
                max[axis] = Math.max(max[axis], positions[i + axis]);
            }
        }

        return vec3(
            (min[0] + max[0]) / 2,
            (min[1] + max[1]) / 2,
            (min[2] + max[2]) / 2
        );
    }

    getBoundingRadius() {
        throw new Error(
            "getBoundingRadius must be implemented by the subclass."
        );
    }

    isSubdivisble() {
        throw new Error(
            "isSubdivisble must be implemented by the subclass."
        );
    }

    subdivide(level) {
        return new this.constructor(level);
    }
}