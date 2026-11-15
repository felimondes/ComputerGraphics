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
    

    getBoundingVolume() {
        if (this.boundingVolume !== undefined) {
            return this.boundingVolume;
        }

        const positions = this.getPositions();
        if (!positions || positions.length === 0) {
            return null;
        }
      
        const center = [0, 0, 0];
        const pointCount = positions.length / 4;
        for (let index = 0; index < positions.length; index += 4) {
            for (let axis = 0; axis < 3; axis++) {
                const value = positions[index + axis];
                if (!Number.isFinite(value)) {
                    throw new Error("Shape positions must be finite to determine its bounding volume.");
                }
                center[axis] += value / pointCount;
            }
        }

        let radius = 0;
        for (let index = 0; index < positions.length; index += 4) {
            radius = Math.max(
                radius,
                Math.hypot(
                    positions[index] - center[0],
                    positions[index + 1] - center[1],
                    positions[index + 2] - center[2]
                )
            );
        }
        if (!Number.isFinite(radius)) {
            throw new RangeError("Shape bounding volume must have a finite radius.");
        }

        this.boundingVolume = { type: "sphere", center, radius };
        return this.boundingVolume;
    }

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

    isSubdivisble() {
        throw new Error(
            "isSubdivisble must be implemented by the subclass."
        );
    }

    subdivide(level) {
        return new this.constructor(level);
    }
}