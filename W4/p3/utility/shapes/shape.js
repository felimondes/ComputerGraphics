export class Shape {
    constructor() {
        if (new.target === Shape) {
            throw new Error(
                "Shape is an abstract class and cannot be instantiated directly."
            );
        }
    }

    createShape() {
        throw new Error("createShape must be implemented by the subclass.");
    }

    createWireframe() {
        throw new Error("createWireframe must be implemented by the subclass.");
    }

    getBoundingRadius() {
        throw new Error(
            "getBoundingRadius must be implemented by the subclass."
        );
    }
}