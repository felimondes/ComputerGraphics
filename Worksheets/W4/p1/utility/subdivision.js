export function loopSubdivision(points, indices, iterations = 1) {
    let positions = points.slice();
    let triangles = Array.from(indices);

    for (let iteration = 0; iteration < iterations; iteration++) {
        const nextPositions = positions.slice();
        const nextIndices = [];
        const midpointIndices = new Map();

        const getMidpointIndex = (firstIndex, secondIndex) => {
            const key = firstIndex < secondIndex
                ? `${firstIndex}:${secondIndex}`
                : `${secondIndex}:${firstIndex}`;

            if (!midpointIndices.has(key)) {
                const first = positions[firstIndex];
                const second = positions[secondIndex];
                const midpoint = normalize(vec3(
                    first[0] + second[0],
                    first[1] + second[1],
                    first[2] + second[2]
                ));

                midpointIndices.set(key, nextPositions.length);
                nextPositions.push(midpoint);
            }

            return midpointIndices.get(key);
        };

        for (let index = 0; index < triangles.length; index += 3) {
            const first = triangles[index];
            const second = triangles[index + 1];
            const third = triangles[index + 2];

            const firstSecond = getMidpointIndex(first, second);
            const secondThird = getMidpointIndex(second, third);
            const thirdFirst = getMidpointIndex(third, first);

            nextIndices.push(
                first, firstSecond, thirdFirst,
                second, secondThird, firstSecond,
                third, thirdFirst, secondThird,
                firstSecond, secondThird, thirdFirst
            );
        }

        positions = nextPositions;
        triangles = nextIndices;
    }

    return {
        positions,
        indices: new Uint32Array(triangles),
    };
}

function normalize(vertex) {
    const length = Math.hypot(vertex[0], vertex[1], vertex[2]);
    return vec3(vertex[0] / length, vertex[1] / length, vertex[2] / length);
}