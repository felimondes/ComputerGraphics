
export function bounce(object, world) {

    const nextVelocity = object.getNextVelocity();
    let velocity = vec3(
        nextVelocity[0],
        nextVelocity[1],
        nextVelocity[2]
    );
    const nextPosition = object.getNextPosition();
    const radius = object.getBoundingRadius();

    for (let axis = 0; axis < 3; axis++) {

        if (
            nextPosition[axis] + radius > world.max[axis] ||
            nextPosition[axis] - radius < world.min[axis]
        ) {
            velocity[axis] *= -1;
        }
    }

    object.velocity = velocity;
    object.center = add(object.center, velocity);
    object.aabb = object.updateAABB();
}