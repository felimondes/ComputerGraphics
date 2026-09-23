import { randomBetween } from "../functions.js";
import { Object } from "./object.js";

export function createRandom(width = randomBetween(0.1, 0.5), height = randomBetween(0.1, 0.5)) {
    const center = vec3(
        randomBetween(-0.5, 0.5),
        randomBetween(-0.5, 0.5),
        0
    );
    const r = new Rectangle(center, width, height);
    return r;
};

export class Rectangle extends Object {

    constructor(center, width, height) {
        super(center);
        this.width = width;
        this.height = height;
        this.positions = this.createShape();
    }


    createShape() {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;

        const topLeft = vec3(-halfWidth, halfHeight, 0);
        const topRight = vec3(halfWidth, halfHeight, 0);
        const bottomLeft = vec3(-halfWidth, -halfHeight, 0);
        const bottomRight = vec3(halfWidth, -halfHeight, 0);

        return [
            topLeft,
            bottomLeft,
            topRight,

            bottomLeft,
            bottomRight,
            topRight
        ];
    }

    getBoundingRadius() {
        return Math.sqrt(
            (this.width / 2) ** 2 +
            (this.height / 2) ** 2
        );
    }
};






