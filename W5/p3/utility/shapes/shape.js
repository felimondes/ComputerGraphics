export class Shape {
    constructor() {
        if (new.target === Shape) {
            throw new Error(
                "Shape is an abstract class and cannot be instantiated directly."
            );
        }
    }

    getBoundingRadius() {
        throw new Error(
            "getBoundingRadius must be implemented by the subclass."
        );
    }
}