import { randomBetween } from "../functions.js";
import { Object } from "./object.js";

export function createRandom(width = randomBetween(0.1, 0.5), height = randomBetween(0.1, 0.5)) {
    const center = vec3(
        randomBetween(-0.5, 0.5),
        randomBetween(-0.5, 0.5),
        0
    );
    const r = new Rectangle(center, width, height);
    r.rotation = vec3(0.0, 0.0, 0.0);
    r.angularVelocity = vec3(0.0, 0, 0);
    r.velocity = vec3(0.005, 0.01, 0.0);
    return r;
};

export function createFixed(center, width = randomBetween(0.2, 0.8), height = randomBetween(0.2, 0.8)) {
    const r = new Rectangle(center, width, height);
    r.rotation = vec3(0.0, 0.0, 0.0);
    r.angularVelocity = vec3(0.0, 0.0, 0.0);
    r.velocity = vec3(0.0, 0.0, 0.);
    return r;
};


export function createFixed1(center, width = randomBetween(0.2, 0.8), height = randomBetween(0.2, 0.8)) {
    const r = new Rectangle(center, width, height);
    r.rotation = vec3(0.0, 0.0, 0.0);
    r.angularVelocity = vec3(0.0, 0.0, 0.0);
    r.velocity = vec3(0.0, -0.03, 0.);
    return r;
};

export function createFixed2(center, width = randomBetween(0.2, 0.8), height = randomBetween(0.2, 0.8)) {
    const r = new Rectangle(center, width, height);
    r.rotation = vec3(0.0, 0.0, 0.0);
    r.angularVelocity = vec3(0.0, 0.0, 0.0);
    r.velocity = vec3(0.0, 0.01, 0.);
    return r;
};

export class Rectangle extends Object {

    constructor(center, width, height) {
        super(center);
        this.width = width;
        this.height = height;
        this.positions = this.createShape();
        this.aabb = this.updateAABB();
    }

    updateAABB() {
        return {
            min: vec3(
                this.center[0] - this.width / 2,
                this.center[1] - this.height / 2,
                this.center[2]
            ),
            max: vec3(
                this.center[0] + this.width / 2,
                this.center[1] + this.height / 2,
                this.center[2]
            )
        };
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






