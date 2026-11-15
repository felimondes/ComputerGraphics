export function covarianceMatrix(positions) {
    if (positions.length % 4 !== 0 || positions.length === 0) {
        throw new Error("Positions must be vec4 data.");
    }

    const n = positions.length / 4;
    const mean = [0, 0, 0];
    for (let i = 0; i < positions.length; i += 4) {
        for (let axis = 0; axis < 3; axis++) {
            mean[axis] += positions[i + axis] / n;
        }
    }

    const covariance = Array(9).fill(0);
    for (let i = 0; i < positions.length; i += 4) {
        const p = [
            positions[i] - mean[0],
            positions[i + 1] - mean[1],
            positions[i + 2] - mean[2],
        ];
        covariance[0] += p[0] * p[0];
        covariance[1] += p[0] * p[1];
        covariance[2] += p[0] * p[2];
        covariance[4] += p[1] * p[1];
        covariance[5] += p[1] * p[2];
        covariance[8] += p[2] * p[2];
    }

    covariance[3] = covariance[1];
    covariance[6] = covariance[2];
    covariance[7] = covariance[5];

    for (let i = 0; i < 9; i++) {
        covariance[i] /= n;
    }

    return { mean, covariance };
}

export function powerIteration(matrix, iterations = 20, tolerance = 1e-6) {
    const v = [Math.random(), Math.random(), Math.random()];
    let vlen = Math.hypot(v[0], v[1], v[2]);
    v[0] /= vlen;
    v[1] /= vlen;
    v[2] /= vlen;

    for (let iter = 0; iter < iterations; iter++) {
        const Av = [
            matrix[0] * v[0] + matrix[1] * v[1] + matrix[2] * v[2],
            matrix[3] * v[0] + matrix[4] * v[1] + matrix[5] * v[2],
            matrix[6] * v[0] + matrix[7] * v[1] + matrix[8] * v[2],
        ];

        const lambda = Math.hypot(Av[0], Av[1], Av[2]);
        if (lambda < tolerance) break;

        const prevV = [...v];
        v[0] = Av[0] / lambda;
        v[1] = Av[1] / lambda;
        v[2] = Av[2] / lambda;

        const diff = Math.hypot(
            v[0] - prevV[0],
            v[1] - prevV[1],
            v[2] - prevV[2]
        );
        if (diff < tolerance) break;
    }

    return v;
}

export function deflateMatrix(matrix, eigenvalue, eigenvector) {
    const result = [...matrix];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            result[i * 3 + j] -= eigenvalue * eigenvector[i] * eigenvector[j];
        }
    }
    return result;
}

export function principalComponents(positions, mean) {
    const { mean: computedMean, covariance } = covarianceMatrix(positions);
    const useMean = mean || computedMean;

    const axes = [];
    let matrix = [...covariance];

    for (let component = 0; component < 3; component++) {
        const eigenvector = powerIteration(matrix);
        let eigenvalue = 0;
        for (let i = 0; i < 3; i++) {
            eigenvalue +=
                eigenvector[i] *
                (matrix[i * 3] * eigenvector[0] +
                    matrix[i * 3 + 1] * eigenvector[1] +
                    matrix[i * 3 + 2] * eigenvector[2]);
        }

        axes.push({ vector: eigenvector, value: eigenvalue });
        if (component < 2) {
            matrix = deflateMatrix(matrix, eigenvalue, eigenvector);
        }
    }

    axes.sort((a, b) => b.value - a.value);
    return { 
        axes: axes.map(a => a.vector), 
        eigenvalues: axes.map(a => a.value),
        mean: useMean
    };
}
