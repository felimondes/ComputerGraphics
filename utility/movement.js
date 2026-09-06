

export function bounce(position, velocity, radius) {

    const nextPosition = add(position, velocity);

    const sx = Math.sign(
        1 - radius - Math.abs(nextPosition[0])
    );

    const sy = Math.sign(
        1 - radius - Math.abs(nextPosition[1])
    );

    const nextVelocity = vec3(
        sx * velocity[0],
        sy * velocity[1],
        0
    );

    return {
        position: nextPosition,
        velocity: nextVelocity
    };
}