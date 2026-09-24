import { randomBetween } from "../functions.js";
import { Object } from "./object.js";

export function createRandom() {
    const center = vec3(
            randomBetween(-0.5, 0.5),
            randomBetween(-0.5, 0.5),
            0
    );
    // const radius = randomBetween(0.1, 0.2);
    const radius = 0.1
    const segments = Math.floor(10 * radius + 10);
    const c = new Circle(center, radius, segments)
    return c
}






export class Circle extends Object {

    constructor(center, radius, segments) {
        super(center);
        this.radius = radius;
        this.segments = segments;
        this.positions = this.createShape();
        this.aabb = this.updateAABB();
    }

    updateAABB() {
        return {
            min: vec3(
                this.center[0] - this.radius,
                this.center[1] - this.radius,
                this.center[2]
            ),
            max: vec3(
                this.center[0] + this.radius,
                this.center[1] + this.radius,
                this.center[2]
            )
        };
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
