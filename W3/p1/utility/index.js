export function createIndexBuffer(device, indices) {
    const indexBuffer = device.createBuffer({
        size: indices.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(
        indexBuffer,
        0,
        indices
    );

    return indexBuffer;
}