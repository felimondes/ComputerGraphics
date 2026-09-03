
export function createCircle(r = 0.5, n = 15) {
    const positions = [];

    const center = vec2(0, 0);

    for (let i = 0; i < n; i++) {

        const theta = (2 * Math.PI * i) / n;
        const nextTheta = (2 * Math.PI * (i + 1)) / n;

        const point = vec2(
            r * Math.cos(theta),
            r * Math.sin(theta)
        );

        const nextPoint = vec2(
            r * Math.cos(nextTheta),
            r * Math.sin(nextTheta)
        );

        positions.push(point);
        positions.push(center);
        positions.push(nextPoint);
    }
    return positions;
}