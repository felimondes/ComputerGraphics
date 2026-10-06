export function createVertexBuffer(device, positions) {
    const data = flatten(positions);
    const positionBuffer = device.createBuffer({
        size: Math.max(data.byteLength, 4),
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(positionBuffer, /*bufferOffset=*/0, data);

    return positionBuffer;
};


export function createVertexBufferLayout(type, format, shaderLocation) {
    const positionBufferLayout = {
        arrayStride: sizeof[type],
        attributes: [{
            format: format,
            offset: 0,
            shaderLocation: shaderLocation, // Position, see vertex shader
        }],
    }
    return positionBufferLayout;
}


//takes model matrices of given shapes, and put them as points???
export function createInstanceBuffer(device, modelMatrices) {
    const data = new Float32Array(
        modelMatrices.flatMap(model => Array.from(flatten(model)))
    );
    const instanceBuffer = device.createBuffer({
        size: data.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(instanceBuffer, 0, data);
    return instanceBuffer;
}

export function createInstanceBufferLayout() {
    return {
        arrayStride: 64,
        stepMode: 'instance',
        attributes: [
            { format: 'float32x4', offset: 0, shaderLocation: 1 }, //first vector in model matrix
            { format: 'float32x4', offset: 16, shaderLocation: 2 }, //second ...
            { format: 'float32x4', offset: 32, shaderLocation: 3 }, //...
            { format: 'float32x4', offset: 48, shaderLocation: 4 },
        ],
    };
}