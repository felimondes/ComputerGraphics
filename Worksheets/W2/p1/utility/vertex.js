export function createVertexBuffer(device, positions) {
    const positionBuffer = device.createBuffer({
        size: flatten(positions).byteLength, //more space than needed!
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(positionBuffer, /*bufferOffset=*/0, flatten(positions));

    return positionBuffer;
};

export function createVertexBufferLayout() {
    const positionBufferLayout = {
        arrayStride: sizeof['vec2'],
        attributes: [{
            format: 'float32x2',
            offset: 0,
            shaderLocation: 0, // Position, see vertex shader
        }],
    }
    return positionBufferLayout;
}