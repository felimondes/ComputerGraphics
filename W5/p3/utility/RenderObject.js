export class RenderObject {
    constructor(shape, center) {
        this.shape = shape;
        this.center = center;
        this.timeStep = 1 / 60; //TODO change to not scale with FPS, but real time passed

        //default valus
        this.velocity = vec3(0, 0, 0);
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

    step(world) {
        const dt = this.timeStep;
        const dt_v = vec3(dt, dt, dt)

        let nextVelocity = add(
            this.velocity,
            mult(this.acceleration, dt_v));

        let nextPosition = add(
            this.center,
            mult(nextVelocity, dt_v)
        );


        let velocity = nextVelocity;

        const radius = this.shape.getBoundingRadius();
        this.ifOutOfBoundsFlipVelocity(nextPosition, radius, world, velocity);

        this.velocity = velocity;
        this.center = nextPosition;
        this.rotation = add(
            this.rotation,
            mult(this.angularVelocity, dt_v)
        );
    }

    getM() { //Rotation and translation aka. RT = M. U can also scale here, but that is not done. And if u do, fix BoundingRadius problems.
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

}
