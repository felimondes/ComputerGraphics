export class RenderObject {
    constructor(shape, center = vec3(0,0,0)) {
        this.shape = shape;
        this.center = center;
        this.timeStep = 1 / 60; //TODO change to not scale with FPS, but real time passed

        //default valus
        this.velocity = vec3(0, 0, 0);
        this.acceleration = vec3(0, 0, 0);

        this.rotation = vec3(0, 0, 0);
        this.angularVelocity = vec3(0, 0, 0);
        this.scalingFactor = vec3(1, 1, 1);
    }

    ifOutOfBoundsFlipVelocity(nextPosition, bounds, world, velocity) {
        for (let axis = 0; axis < 3; axis++) {
            if (nextPosition[axis] + bounds.max[axis] > world.max[axis]) {
                nextPosition[axis] = world.max[axis] - bounds.max[axis];

                if (velocity[axis] > 0) {
                    velocity[axis] *= -1;
                }
            }

            if (nextPosition[axis] + bounds.min[axis] < world.min[axis]) {
                nextPosition[axis] = world.min[axis] - bounds.min[axis];

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

        const localBounds = this.shape.getBoundingBox?.();
        const radius = this.shape.getBoundingRadius();
        const bounds = localBounds
            ? localBounds
            : {
                min: [-radius, -radius, -radius],
                max: [radius, radius, radius],
            };
        const rotation = mult(
            rotateZ(this.rotation[2]),
            mult(rotateY(this.rotation[1]), rotateX(this.rotation[0]))
        );
        const transform = mult(rotation, scalem(this.scalingFactor));
        const transformedBounds = {
            min: [Infinity, Infinity, Infinity],
            max: [-Infinity, -Infinity, -Infinity],
        };
        for (const x of [bounds.min[0], bounds.max[0]]) {
            for (const y of [bounds.min[1], bounds.max[1]]) {
                for (const z of [bounds.min[2], bounds.max[2]]) {
                    const point = mult(transform, vec4(x, y, z, 1));
                    for (let axis = 0; axis < 3; axis++) {
                        transformedBounds.min[axis] = Math.min(
                            transformedBounds.min[axis],
                            point[axis]
                        );
                        transformedBounds.max[axis] = Math.max(
                            transformedBounds.max[axis],
                            point[axis]
                        );
                    }
                }
            }
        }
        this.ifOutOfBoundsFlipVelocity(
            nextPosition,
            transformedBounds,
            world,
            velocity
        );

        this.velocity = velocity;
        this.center = nextPosition;
        this.rotation = add(
            this.rotation,
            mult(this.angularVelocity, dt_v)
        );
    }

    getM() {
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
            mult(rotation, scalem(this.scalingFactor))
        );
    }

}
