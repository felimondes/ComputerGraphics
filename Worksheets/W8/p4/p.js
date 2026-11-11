import * as uniform from "../../utility/uniform.js";

const gpu = navigator.gpu;
const adapter = await gpu.requestAdapter();
const device = await adapter.requestDevice();
const canvas = document.getElementById("my-canvas");
const context = canvas.getContext("webgpu");
const canvasFormat = gpu.getPreferredCanvasFormat();
context.configure({ device, format: canvasFormat });

//Data
const positions = [
    // Textured ground
    vec4(-2, -1, -1, 1),
    vec4(2, -1, -1, 1),
    vec4(2, -1, -5, 1),
    vec4(-2, -1, -5, 1),

    // Red quad parallel to the ground
    vec4(0.25, -0.5, -1.25, 1),
    vec4(0.75, -0.5, -1.25, 1),
    vec4(0.75, -0.5, -1.75, 1),
    vec4(0.25, -0.5, -1.75, 1),

    // Red quad perpendicular to the ground
    vec4(-1, -1, -2.5, 1),
    vec4(-1, 0, -2.5, 1),
    vec4(-1, 0, -3, 1),
    vec4(-1, -1, -3, 1),
];

const textureCoordinates = [
    vec2(0, 0), vec2(1, 0), vec2(1, 1), vec2(0, 1), //ground
    vec2(0, 0), vec2(1, 0), vec2(1, 1), vec2(0, 1), //quad parallel
    vec2(0, 0), vec2(1, 0), vec2(1, 1), vec2(0, 1), //quad perpendicular
];

const vertexData = new Float32Array(
    positions.flatMap((position, index) => [
        ...position,
        ...textureCoordinates[index],
    ])
);


//Vertexbuffers and layout
const positionStride = 16;
const textureCoordinateStride = 8;
const vertexBufferLayout = {
    arrayStride: positionStride + textureCoordinateStride,
    attributes: [
        { format: "float32x4", offset: 0, shaderLocation: 0 },
        { format: "float32x2", offset: positionStride, shaderLocation: 1 },
    ],
};

const vertexBuffer = device.createBuffer({
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(vertexBuffer, 0, vertexData);


//Index buffers
const indices = new Uint32Array([
    0, 1, 2, 0, 2, 3, //indicies for ground, just +4 to get others
    4, 5, 6, 4, 6, 7,
    8, 9, 10, 8, 10, 11,
]);
const indexBuffer = device.createBuffer({
    size: indices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(indexBuffer, 0, indices);


//Uniforms
const projection = perspective(90, canvas.width / canvas.height, 0.01, 100);
const uniformLayout = [
    { name: "P", type: "mat4" },
    { name: "M", type: "mat4" },
    { name: "isShadow", type: "f32" },
];
const uniforms = uniform.createBufferAndLayout(device, uniformLayout);
const shadowUniforms = uniform.createBufferAndLayout(device, uniformLayout);
const identity = mat4();
uniform.add(device, uniforms, {
    P: projection,
    M: identity,
    isShadow: 0,
});


//Textures
//Ground
const imageResponse = await fetch("../../utility/images/xamp23.png");
const imageBitmap = await createImageBitmap(
    await imageResponse.blob(),
    { colorSpaceConversion: "none" }
);
const groundTexture = device.createTexture({
    size: [imageBitmap.width, imageBitmap.height, 1],
    format: "rgba8unorm",
    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
});
device.queue.copyExternalImageToTexture(
    { source: imageBitmap, flipY: true },
    { texture: groundTexture },
    [imageBitmap.width, imageBitmap.height]
);

//Red
const redTexture = device.createTexture({
    size: [1, 1, 1],
    format: "rgba8unorm",
    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,
});
device.queue.writeTexture(
    { texture: redTexture },
    new Uint8Array([255, 0, 0, 255]),
    { bytesPerRow: 4, rowsPerImage: 1 },
    [1, 1, 1]
);

const sampler = device.createSampler({
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
    minFilter: "linear",
    magFilter: "linear",
});


//Rendering
const shaderElement = document.getElementById("wgsl");
const shaderResponse = await fetch(shaderElement.src);
const shaderModule = device.createShaderModule({
    label: "W8 Part 1 shader",
    code: await shaderResponse.text(),
});


const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
        module: shaderModule,
        entryPoint: "main_vs",
        buffers: [vertexBufferLayout],
    },
    fragment: {
        module: shaderModule,
        entryPoint: "main_fs",
        targets: [{
            format: canvasFormat
        }],
    },
    primitive: {
        topology: "triangle-list",
        cullMode: "none",
    },
    depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "less",
    },
});

const shadowPipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
        module: shaderModule,
        entryPoint: "main_vs",
        buffers: [vertexBufferLayout],
    },
    fragment: {
        module: shaderModule,
        entryPoint: "main_fs",
        targets: [{
            format: canvasFormat,
            blend: {
                color: { operation: "add", srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
                alpha: { operation: "add", srcFactor: "one", dstFactor: "zero" }
            },
        }],
    },
    primitive: {
        topology: "triangle-list",
        cullMode: "none",
    },
    depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "greater",
    },
});

function createTextureBindGroup(texture, uniformBuffer, targetPipeline = pipeline) {
    return device.createBindGroup({
        layout: targetPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: uniformBuffer },
            { binding: 1, resource: sampler },
            { binding: 2, resource: texture.createView() },
        ],
    });
}

const groundBindGroup = createTextureBindGroup(groundTexture, uniforms.buffer);
const redBindGroup = createTextureBindGroup(redTexture, uniforms.buffer);
const shadowBindGroup = createTextureBindGroup(
    redTexture,
    shadowUniforms.buffer,
    shadowPipeline
);

const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height, 1],
    format: "depth24plus",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
});

const shadowOffset = 0.001;
const plane = vec4(0, 1, 0, 1 + shadowOffset);
const lightHeight = 2;

function createShadowProjection(light) {
    const planeLightDot = dot(plane, light);
    return mat4(...Array.from({ length: 16 }, (_, index) => {
        const row = Math.floor(index / 4);
        const column = index % 4;
        return planeLightDot * (row === column ? 1 : 0) -
            light[row] * plane[column];
    }));
}

function render(timestamp) {
    const angle = timestamp * 2 * Math.PI / 6000;
    const light = vec4(
        2 * Math.cos(angle),
        lightHeight,
        -2 + 2 * Math.sin(angle),
        1
    );
    const shadowProjection = createShadowProjection(light);
    uniform.add(device, shadowUniforms, {
        P: projection,
        M: shadowProjection,
        isShadow: 1,
    });

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            loadOp: "clear",
            storeOp: "store",
            clearValue: { r: 1, g: 1, b: 1, a: 1 },
        }],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthLoadOp: "clear",
            depthClearValue: 1,
            depthStoreOp: "store",
        },
    });

    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setIndexBuffer(indexBuffer, "uint32");
    pass.setBindGroup(0, groundBindGroup);
    pass.drawIndexed(6, 1, 0);

    pass.setPipeline(shadowPipeline);
    pass.setBindGroup(0, shadowBindGroup);
    pass.drawIndexed(12, 1, 6);

    pass.setPipeline(pipeline);
    pass.setBindGroup(0, redBindGroup);
    pass.drawIndexed(12, 1, 6);
    pass.end();
    device.queue.submit([encoder.finish()]);
    requestAnimationFrame(render);
}

requestAnimationFrame(render);
