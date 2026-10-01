export function loopSubdivision(points, indices, iterations = 1) {
    let positions = points.slice();
    let triangles = new Uint32Array(indices);

    for (let iteration = 0; iteration < iterations; iteration++) {
        triangles = subdivide_sphere(positions, triangles);
    }

    return {
        positions,
        indices: new Uint32Array(triangles),
    };
}

export function subdivide_sphere(positions, indices) {
    const new_indices = new Uint32Array(indices.length * 4);
    const triangles = indices.length / 3;

    for (let i = 0; i < triangles; ++i) {
        const i0 = indices[i * 3];
        const i1 = indices[i * 3 + 1];
        const i2 = indices[i * 3 + 2];
        const c01 = positions.length;
        const c12 = c01 + 1;
        const c20 = c01 + 2;

        positions.push(
            midpoint(positions[i0], positions[i1]),
            midpoint(positions[i1], positions[i2]),
            midpoint(positions[i2], positions[i0])
        );

        new_indices.set([
            i0, c01, c20,
            c20, c01, c12,
            c12, c01, i1,
            c20, c12, i2,
        ], i * 12);
    }

    return new_indices;
}

function midpoint(first, second) {
    return normalize(vec3(
        first[0] + second[0],
        first[1] + second[1],
        first[2] + second[2]
    ));
}

function normalize(vertex) {
    const length = Math.hypot(vertex[0], vertex[1], vertex[2]);
    return vec3(vertex[0] / length, vertex[1] / length, vertex[2] / length);
}