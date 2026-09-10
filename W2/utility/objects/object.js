
let nextObjectId = 0;

export class Object {
    constructor(center) {
        if (new.target === Object) {
            throw new Error(
                "Object is an abstract class and cannot be instantiated directly."
            );
        }

        this.id = nextObjectId++;
        this.positions;
        this.aabb;

        this.center = center;
        this.velocity = vec3(0, 0, 0);
        this.acceleration = vec3(0, 0, 0);
        this.timeStep = 1 / 60;
        this.mass = 1;
        this.restitution = 0.85;
        this.rotation = vec3(0, 0, 0);
        this.angularVelocity = vec3(0, 0, 0);
    }

    updateAABB() {
        throw new Error(
            "updateAABB must be implemented by the subclass."
        );
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

        const radius = this.getBoundingRadius();

        this.ifOutOfBoundsFlipVelocity(nextPosition, radius, world, velocity);

        this.velocity = velocity;
        this.center = nextPosition;
        this.aabb = this.updateAABB();
    }

    resolveCollision(other, collisionData) {
        const normal = collisionData.normal;
        const overlap = collisionData.overlap;

        const relativeVelocity = subtract(other.velocity, this.velocity);
        const velocityAlongNormal = dot(relativeVelocity, normal);

        const massA = this.mass;
        const massB = other.mass;
        const restitution = Math.min(
            this.restitution,
            other.restitution
        );

        if (velocityAlongNormal < 0) {
            const impulseMagnitude = (
                -(1 + restitution) * velocityAlongNormal
            ) / ((1 / massA) + (1 / massB));


            const impulse = scale(impulseMagnitude, normal);

            this.velocity = subtract(
                this.velocity, mult(
                    impulse,
                    vec3(1 / massA, 1 / massA, 1 / massA))
            );

            other.velocity = add(
                other.velocity, mult(
                    impulse,
                    vec3(1 / massB, 1 / massB, 1 / massB))
            );

        }

        const totalMass = massA + massB;
        const correctionA = (massB / totalMass) * overlap;
        const correctionB = (massA / totalMass) * overlap;

        this.center = subtract(this.center, mult(normal, vec3(correctionA, correctionA, correctionA)));
        other.center = add(other.center, mult(normal, vec3(correctionB, correctionB, correctionB)));

        this.aabb = this.updateAABB();
        other.aabb = other.updateAABB();

        return true;
    }

    getModelMatrix() {
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
