import { randomBetween } from "../functions.js";
import { Object } from "./object.js";

export function createRandom() {
        let radius = randomBetween(0.1, 0.4);
        let segments = Math.floor(10*radius + 10);
        let c = new Circle(radius, segments)
        c.rotation = vec3(0.0, 0.0, 0.0);
        c.angularVelocity = vec3(0.0, 0, 1);
        c.velocity = vec3(0.005, 0.01, 0.0);
        return c
    }

export class Circle extends Object {

    constructor(radius, segments,
    ) {
        super();
        this.radius = radius;
        this.segments = segments;
        this.positions = this.createShape();
    }

    createShape() {
        const positions = [];
        const center = vec3(0, 0, 0);
        for (let i = 0; i < this.segments; i++) {
            const theta = (2 * Math.PI * i) / this.segments;
            const nextTheta = (2 * Math.PI * (i + 1)) / this.segments;

            const point = vec3(
                this.radius * Math.cos(theta),
                this.radius * Math.sin(theta),
                0
            );

            const nextPoint = vec3(
                this.radius * Math.cos(nextTheta),
                this.radius * Math.sin(nextTheta),
                0
            );

            positions.push(point);
            positions.push(center);
            positions.push(nextPoint);
        }
        return positions;
    }

    getBoundingRadius() {
        return this.radius;
    }

}
