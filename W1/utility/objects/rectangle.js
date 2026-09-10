import { randomBetween } from "../functions.js";
import { Object } from "./object.js";



export function createRandom(width = randomBetween(0.2, 0.8), height = randomBetween(0.2, 0.8)) {
    const r = new Rectangle(width, height);
    r.rotation = vec3(0.0, 0.0, 0.0);
    r.angularVelocity = vec3(0.0, 0.0, 0.1);
    r.velocity = vec3(0.0, 0.01, 0.0);
    return r;
};

export function createFixed(width, height) {
    const r = new Rectangle(width, height);
    r.rotation = vec3(0.0, 0.0, 0.0);
    r.angularVelocity = vec3(0.0, 0.0, 0.0);
    r.velocity = vec3(0.0, 0.0, 0.);
    return r;
};

export class Rectangle extends Object {

    constructor(width, height) {
        super();
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






