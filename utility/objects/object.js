export class Object2D {
    constructor() {
        // Common object state
        this.position = vec2(0.0, 0.0);
        this.velocity = vec2(0.0, 0.0);

        this.theta = 0.0;
        this.angularVelocity = 0.0;
    }

    update() {
        throw new Error("Object2D.update() must be implemented");
    }

    createGeometry() {
        throw new Error("Object2D.createGeometry() must be implemented");
    }
}