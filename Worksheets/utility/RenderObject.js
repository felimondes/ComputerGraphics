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

    ifOutOfBoundsFlipVelocity(nextPosition, radius, world, velocity) {
        for (let axis = 0; axis < 3; axis++) {
            if (radius * 2 > world.max[axis] - world.min[axis]) {
                throw new RangeError("Object bounding volume does not fit inside the world bounds.");
            }
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

        const currentVolume = this.getBoundingVolume();
        const worldVolumeCenter = add(
            currentVolume.center,
            subtract(nextPosition, this.center)
        );
        this.ifOutOfBoundsFlipVelocity(
            worldVolumeCenter,
            currentVolume.radius,
            world,
            velocity
        );
        nextPosition = subtract(
            worldVolumeCenter,
            subtract(currentVolume.center, this.center)
        );

        this.velocity = velocity;
        this.center = nextPosition;
        this.rotation = add(
            this.rotation,
            mult(this.angularVelocity, dt_v)
        );
    }

    getBoundingVolume() {
        const volume = this.shape.getBoundingVolume();
        if (!volume || volume.type !== "sphere") {
            throw new TypeError("RenderObject requires a shape with a spherical bounding volume.");
        }

        const transformedCenter = mult(
            this.getM(),
            vec4(...volume.center, 1)
        );
        return {
            type: "sphere",
            center: vec3(
                transformedCenter[0],
                transformedCenter[1],
                transformedCenter[2]
            ),
            radius: volume.radius * Math.max(
                Math.abs(this.scalingFactor[0]),
                Math.abs(this.scalingFactor[1]),
                Math.abs(this.scalingFactor[2])
            ),
        };
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
