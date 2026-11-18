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
        const p = subtract([positions[i], positions[i + 1], positions[i + 2]], mean);
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

export function principalComponents(positions, mean) {
    const { mean: computedMean, covariance } = covarianceMatrix(positions);
    const matrix = [
        covariance.slice(0, 3),
        covariance.slice(3, 6),
        covariance.slice(6, 9),
    ];
    const vectors = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    for (let iteration = 0; iteration < 32; iteration++) {
        let p = 0;
        let q = 1;
        for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) {
            if (Math.abs(matrix[i][j]) > Math.abs(matrix[p][q])) {
                p = i;
                q = j;
            }
        }
        const scale = Math.max(...matrix.map((row, i) => Math.abs(row[i])));
        if (Math.abs(matrix[p][q]) <= scale * 1e-14) break;

        const tau = (matrix[q][q] - matrix[p][p]) / (2 * matrix[p][q]);
        const t = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.hypot(1, tau));
        const c = 1 / Math.hypot(1, t);
        const s = t * c;
        const offDiagonal = matrix[p][q];
        matrix[p][p] -= t * offDiagonal;
        matrix[q][q] += t * offDiagonal;
        matrix[p][q] = matrix[q][p] = 0;
        for (let k = 0; k < 3; k++) {
            if (k !== p && k !== q) {
                const kp = matrix[k][p];
                const kq = matrix[k][q];
                matrix[k][p] = matrix[p][k] = c * kp - s * kq;
                matrix[k][q] = matrix[q][k] = s * kp + c * kq;
            }
            const vp = vectors[k][p];
            const vq = vectors[k][q];
            vectors[k][p] = c * vp - s * vq;
            vectors[k][q] = s * vp + c * vq;
        }
    }
    const order = [0, 1, 2].sort((a, b) => matrix[b][b] - matrix[a][a]);
    const axes = order.map(column => vectors.map(row => row[column]));
    if (dot(cross(axes[0], axes[1]), axes[2]) < 0) {
        axes[2] = axes[2].map(value => -value);
    }
    return {
        axes,
        eigenvalues: order.map(index => matrix[index][index]),
        mean: mean || computedMean,
    };
}
