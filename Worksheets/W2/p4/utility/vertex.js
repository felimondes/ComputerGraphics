export function createVertexBuffer(device, positions) {
    const data = flatten(positions);
    const positionBuffer = device.createBuffer({
        size: Math.max(data.byteLength, 4),
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(positionBuffer, /*bufferOffset=*/0, data);

    return positionBuffer;
};

export function createVertexBufferLayout(shaderLocation, type, format) {
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