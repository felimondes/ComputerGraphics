export function createBufferAndLayout(device, positions) {
    const positionBuffer = device.createBuffer({
        size: flatten(positions).byteLength, //more space than needed!
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(positionBuffer, /*bufferOffset=*/0, flatten(positions));

    //Vertex buffer layout
    const positionBufferLayout = {
        arrayStride: sizeof['vec3'],
        attributes: [{
            format: 'float32x3',
            offset: 0,
            shaderLocation: 0, // Position, see vertex shader
        }],
    }

    return {
        buffer: positionBuffer,
        layout: positionBufferLayout
    }

}