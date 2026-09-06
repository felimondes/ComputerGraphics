export function createCircle(radius, segments) {
    const positions = [];
    
    const center = vec3(0, 0, 0);

    for (let i = 0; i < segments; i++) {

        const theta = (2 * Math.PI * i) / segments;
        const nextTheta = (2 * Math.PI * (i + 1)) / segments;

        const point = vec3(
            radius * Math.cos(theta),
            radius * Math.sin(theta),
            0
        );

        const nextPoint = vec3(
            radius * Math.cos(nextTheta),
            radius * Math.sin(nextTheta),
            0
        );

        positions.push(point);
        positions.push(center);
        positions.push(nextPoint);
    }
    return positions;
}