import { Object } from "./object.js";



export class Circle extends Object {

    constructor(radius, segments,
    ) {
        super();
        this.radius = radius;
        this.segments = segments;
        this.positions = this.createShape();
    }
  
    getModelMatrix() {
        const translation =
            translate(
                this.center[0],
                this.center[1],
                this.center[2]
            );

        const rotation =
            rotateZ(this.theta);

        return mult(
            translation,
            rotation
        );
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
