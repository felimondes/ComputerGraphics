
export function bounce(object, world) {

    const nextPosition = add(
        object.center,
        object.velocity
    );

    const radius = object.getBoundingRadius();

    for (let axis = 0; axis < 3; axis++) {

        if (
            nextPosition[axis] + radius > world.max[axis] ||
            nextPosition[axis] - radius < world.min[axis]
        ) {
            object.velocity[axis] *= -1;
        }
    }

    object.center = nextPosition;
}