

export class Object {
    constructor(center) {
        if (new.target === Object) {
            throw new Error(
                "Object is an abstract class and cannot be instantiated directly."
            );
        }

        this.positions;
        this.center = center;
        this.timeStep = 1 / 60; //TODO change to not scale with FPS, but real time passed



        //default valus
        this.velocity = vec3(0, 1, 0);
        this.acceleration = vec3(0, 0, 0);

        this.rotation = vec3(0, 0, 0);
        this.angularVelocity = vec3(0, 0, 0);
    }

    ifOutOfBoundsFlipVelocity(nextPosition, radius, world, velocity) {
        for (let axis = 0; axis < 3; axis++) {
            if (nextPosition[axis] + radius > world.max[axis]) {
                nextPosition[axis] = world.max[axis] - radius;

                if (velocity[axis] > 0) {
                    velocity[axis] *= -1;
                }
            }

            if (nextPosition[axis] - radius < world.min[axis]) {
                nextPosition[axis] = world.min[axis] + radius;

                if (velocity[axis] < 0) {
                    velocity[axis] *= -1;
                }
            }
        }
    }

    getM() { //Rotation and translation aka. RT = M
        const translation = translate(this.center);
        const rotationX =
            rotateX(this.rotation[0]);

        const rotationY =
            rotateY(this.rotation[1]);

        const rotationZ =
            rotateZ(this.rotation[2]);

        const rotation =
            mult(
                rotationZ,
                mult(rotationY, rotationX)
            );
        return mult(
            translation,
            rotation
        );
    }

    getBoundingRadius() {
        throw new Error(
            "getBoundingRadius must be implemented by the subclass."
        );
    }

    createShape() {
        throw new Error(
            "createShape must be implemented by the subclass."
        );
    }

}
