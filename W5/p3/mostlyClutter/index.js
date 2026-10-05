//Layouts

// struct VertexInput {
//     @location(0) position: vec3<f32>,
//     @location(1) normal: vec3<f32>,
//     @location(2) color: vec4<f32>,

// VERTEX BUFFER (changes for each vertex)
// ┌────────────┬────────────┐
// │ position   │ normal     │
// │ 16 bytes   │ 16 bytes   │
// └────────────┴────────────┘
export function createVertexBufferLayout() {
    return {
        arrayStride: 32,
        attributes: [
            {
                format: "float32x4",
                offset: 0,
                shaderLocation: 0,
            },
            {
                format: "float32x4",
                offset: 16,
                shaderLocation: 1,
            },
        ]
    };
}


// struct VertexInput {
//     ....
//     @location(2) model0: vec4f,
//     @location(3) model1: vec4f,
//     @location(4) model2: vec4f,
//     @location(5) model3: vec4f,
//
// INSTANCE BUFFER (changes for each instance)
// ┌────────────┬────────────┬────────────┬────────────┐
// │ model0     │ model1     │ model2     │ model3     │
// │ 16 bytes   │ 16 bytes   │ 16 bytes   │ 16 bytes   │
// └────────────┴────────────┴────────────┴────────────┘

export function createInstanceBufferLayout() {
    return {
        arrayStride: 64,
        stepMode: 'instance', //IMPORTANT - ONLY WORKS PER INSTANCE, so for each object that is rendered. 
        attributes: [
            { format: 'float32x4', offset: 0, shaderLocation: 2 }, //first vector in model matrix
            { format: 'float32x4', offset: 16, shaderLocation: 3 }, //second ...
            { format: 'float32x4', offset: 32, shaderLocation: 4 }, //...
            { format: 'float32x4', offset: 48, shaderLocation: 5 },
        ],
    };
}


export function createVertexBuffer(device, positions, normals) {
    if (positions.length % 4 !== 0 || normals.length !== positions.length) {
        throw new Error("Vertex positions and normals must contain matching vec4 data.");
    }

    const data = new Float32Array(positions.length + normals.length);
    for (let vertex = 0; vertex < positions.length / 4; vertex++) {
        const vertexOffset = vertex * 8;
        const attributeOffset = vertex * 4;
        data.set(positions.subarray(attributeOffset, attributeOffset + 4), vertexOffset);
        data.set(normals.subarray(attributeOffset, attributeOffset + 4), vertexOffset + 4);
    }

    const vertexBuffer = device.createBuffer({
        size: Math.max(data.byteLength, 4),
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, data);

    return vertexBuffer;
}


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

//Without an index buffer, you'd have to repeat shared vertices
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

export async function createShaderModule(name, device) {
    const shaderElement = document.getElementById(name);
    const shaderCode = await fetch(shaderElement.src).then(response => response.text());
    return device.createShaderModule({
        label: "Shader:" + name,
        code: shaderCode
    });
}


export async function createDevice() {
    const gpu = navigator.gpu;
    const adapter = await gpu.requestAdapter();
    const device = await adapter.requestDevice();
    return device;
}

export function configureCanvas(device) {
    const canvas = document.getElementById('my-canvas');
    const context = canvas.getContext('webgpu');
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device: device,
        format: canvasFormat,
    });
    return {
        canvas,
        context,
        canvasFormat
    }
}