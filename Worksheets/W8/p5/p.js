import { CameraController } from "../../controls/camera/camera.js";
import { loadControlPanels } from "../../controls/controls.js";
import { LightingController } from "../../controls/lighting/lighting.js";
import { RenderObject } from "../../utility/RenderObject.js";
import { OBJShape } from "../../utility/shapes/OBJShape.js";
import { Sphere } from "../../utility/shapes/sphere.js";
import * as uniform from "../../utility/uniform.js";
import {
    createBindGroup,
    createIndexBuffer,
    createInstanceBuffer,
    createInstanceBufferLayout,
    createVertexBuffer,
    createVertexBufferLayout
} from "../../W5/p4/mostlyClutter/index.js";

await loadControlPanels();


const gpu = navigator.gpu;
const adapter = await gpu.requestAdapter();
const device = await adapter.requestDevice();
const canvas = document.getElementById("my-canvas");
const context = canvas.getContext("webgpu");
const canvasFormat = gpu.getPreferredCanvasFormat();
context.configure({ device, format: canvasFormat });


const lightingController = new LightingController(
    new URL("./lighting.html", import.meta.url)
);
const cameraController = new CameraController(
    canvas,
    new URL("./camera.html", import.meta.url),
    vec3(0, -1, -2)
);
await Promise.all([cameraController.ready, lightingController.ready]);



//Objects (make better later)
const objShape_1 = await OBJShape.fromFile(new URL("./teapot.obj", import.meta.url));
const obj_1_1 = new RenderObject(objShape_1, vec3(0, -1, -2));
obj_1_1.scalingFactor = vec3(0.25, 0.25, 0.25);
let objects_1 = [obj_1_1];


const objShape_2 = new Sphere(5);
const obj_2_1 = new RenderObject(objShape_2, vec3(3, 0, 0));
let objects_2 = [obj_2_1];

const objectLists = [
    { objects: objects_1, shape: objShape_1 },
    { objects: objects_2, shape: objShape_2 },
];


const groundPositions = [
    vec4(-2, -1, -1, 1),
    vec4(2, -1, -1, 1),
    vec4(2, -1, -5, 1),
    vec4(-2, -1, -5, 1),
];
const groundTextureCoordinates = [
    vec2(0, 0),
    vec2(1, 0),
    vec2(1, 1),
    vec2(0, 1),
];
const groundVertexData = new Float32Array(
    groundPositions.flatMap((position, index) => [
        ...position,
        ...groundTextureCoordinates[index],
    ])
);
const groundVertexBuffer = device.createBuffer({
    size: groundVertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(groundVertexBuffer, 0, groundVertexData);

const groundVertexBufferLayout = {
    arrayStride: 24,
    attributes: [
        { format: "float32x4", offset: 0, shaderLocation: 0 },
        { format: "float32x2", offset: 16, shaderLocation: 1 },
    ],
};
const groundIndices = new Uint32Array([0, 1, 2, 0, 2, 3]);
const groundIndexBuffer = device.createBuffer({
    size: groundIndices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(groundIndexBuffer, 0, groundIndices);



//Setup buffers
for (const batch of objectLists) {
    batch.vertexBuffer = createVertexBuffer(
        device,
        batch.shape.getPositions(),
        batch.shape.getNormals()
    );
    batch.instanceBuffer = createInstanceBuffer(device, batch.objects.map(object => object.getM()));
    batch.shadowInstanceBuffer = createInstanceBuffer(
        device,
        batch.objects.map(() => mat4())
    );
    batch.indexBuffer = createIndexBuffer(device, batch.shape.getIndices());
}


//Setup layouts
let vertexBufferLayout = createVertexBufferLayout();
let instanceBufferLayout = createInstanceBufferLayout();


const projection = perspective(90, canvas.width / canvas.height, 0.01, 100);
const groundUniforms = uniform.createBufferAndLayout(device, [
    { name: "V", type: "mat4" },
    { name: "P", type: "mat4" },
]);
const objectUniforms = uniform.createBufferAndLayout(device, [
    { name: "V", type: "mat4" },
    { name: "P", type: "mat4" },
    { name: "kd", type: "f32" },
    { name: "ks", type: "f32" },
    { name: "s", type: "f32" },
    { name: "Le", type: "f32" },
    { name: "La", type: "f32" },
    { name: "eyePosition", type: "vec3" },
]);
const shadowUniforms = uniform.createBufferAndLayout(device, [
    { name: "V", type: "mat4" },
    { name: "P", type: "mat4" },
]);
uniform.add(device, groundUniforms, {
    V: cameraController.V,
    P: projection,
});

//Texture for ground
const imageResponse = await fetch(
    new URL("../../utility/images/xamp23.png", import.meta.url)
);
const imageBitmap = await createImageBitmap(
    await imageResponse.blob(),
    { colorSpaceConversion: "none" }
);
const groundTexture = device.createTexture({
    size: [imageBitmap.width, imageBitmap.height, 1],
    format: "rgba8unorm",
    usage: GPUTextureUsage.COPY_DST |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.RENDER_ATTACHMENT,
});
device.queue.copyExternalImageToTexture(
    { source: imageBitmap, flipY: true },
    { texture: groundTexture },
    [imageBitmap.width, imageBitmap.height]
);
const sampler = device.createSampler({
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
    minFilter: "linear",
    magFilter: "linear",
});

async function loadShaderModule(elementId, label) {
    const shaderElement = document.getElementById(elementId);
    const response = await fetch(shaderElement.src);
    return device.createShaderModule({
        label,
        code: await response.text(),
    });
}

const groundShader = await loadShaderModule("ground-wgsl", "Ground shader");
const objectsShader = await loadShaderModule("objects-wgsl", "Objects shader");
const shadowShader = await loadShaderModule("shadow-wgsl", "Shadow shader");


const groundPipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
        module: groundShader,
        entryPoint: "main_vs",
        buffers: [groundVertexBufferLayout],
    },
    fragment: {
        module: groundShader,
        entryPoint: "main_fs",
        targets: [{ format: canvasFormat }],
    },
    primitive: {
        topology: "triangle-list",
        cullMode: "none",
    },
    depthStencil: {
        format: "depth24plus-stencil8",
        depthWriteEnabled: true,
        depthCompare: "less",
        stencilFront: {compare: "always", passOp: "replace"},
        stencilBack: {compare: "always", passOp: "replace"}
    },
});

const objectPipeline = await createPipeline(
    [vertexBufferLayout, instanceBufferLayout],
    objectsShader
);
async function createPipeline(layouts, shaderModule) {

    const pipeline = device.createRenderPipeline({
        layout: 'auto',

        vertex: {
            module: shaderModule,
            entryPoint: 'main_vs',
            buffers: layouts, //instance and vertex layouts go in here
        },

        fragment: {
            module: shaderModule,
            entryPoint: 'main_fs',
            targets: [{ format: canvasFormat }],
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus-stencil8',
        },

        primitive: {
            topology: 'triangle-list',
            frontFace: "ccw", // options { "ccw", "cw" }
            cullMode: "back", // options { "none", "front", "back" }
        },
    });
    return pipeline
}

const shadowPipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
        module: shadowShader,
        entryPoint: "main_vs",
        buffers: [vertexBufferLayout, instanceBufferLayout],
    },
    fragment: {
        module: shadowShader,
        entryPoint: "main_fs",
        targets: [{
            format: canvasFormat,
            blend: {
                color: {
                    srcFactor: "src-alpha",
                    dstFactor: "one-minus-src-alpha",
                    operation: "add",
                },
                alpha: {
                    srcFactor: "one",
                    dstFactor: "one-minus-src-alpha",
                    operation: "add",
                },
            },
        }],
    },
    primitive: {
        topology: "triangle-list",
        cullMode: "none",
    },
    depthStencil: {
        format: "depth24plus-stencil8",
        depthWriteEnabled: false,
        depthCompare: "always",
        stencilFront: {compare: "equal", passOp: "zero"},
        stencilBack: {compare: "equal", passOp: "zero"}
    },
});





const groundBindGroup = device.createBindGroup({
    layout: groundPipeline.getBindGroupLayout(0),
    entries: [
        { binding: 0, resource: groundUniforms.buffer },
        { binding: 1, resource: sampler },
        { binding: 2, resource: groundTexture.createView() },
    ],
});
const bindGroup = createBindGroup(device, objectUniforms.buffer, objectPipeline);
const shadowBindGroup = createBindGroup(device, shadowUniforms.buffer, shadowPipeline);





const depthStencilTexture = device.createTexture({
    size: [canvas.width, canvas.height, 1],
    format: "depth24plus-stencil8",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
});




//Render

let eyePosition = vec3(
    cameraController.values.eyeX,
    cameraController.values.eyeY,
    cameraController.values.eyeZ
);
let V = cameraController.V;
const world = {
    min: vec3(-10, -10, -10),
    max: vec3(10, 10, 10),
};

function animate(timestamp = 0) {
    cameraController.update(timestamp);
    eyePosition = cameraController.eyePosition;
    V = cameraController.V;

    for (const batch of objectLists) {
        for (const object of batch.objects) {
            object.step(world);
        }

        device.queue.writeBuffer(
            batch.instanceBuffer,
            0,
            new Float32Array(
                batch.objects.flatMap(object => Array.from(flatten(object.getM())))
            )
        );
    }
    render(timestamp);
    requestAnimationFrame(animate);
}







const plane = vec4(0, 1, 0, 1);
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

    //figuring out position
    const angle = timestamp * 2 * Math.PI / 6000;
    const lightPosition = vec3(
        2 * Math.cos(angle),
        lightHeight,
        -2 + 2 * Math.sin(angle)
    );
    const light = vec4(...lightPosition, 1);




    const shadowProjection = createShadowProjection(light);
    for (const batch of objectLists) {
        const shadowMatrices = batch.objects.map((object) =>
            mult(shadowProjection, object.getM())
        );
        device.queue.writeBuffer(
            batch.shadowInstanceBuffer,
            0,
            new Float32Array(
                shadowMatrices.flatMap((matrix) => Array.from(flatten(matrix)))
            )
        );
    }

    uniform.add(device, groundUniforms, { V, P: projection });
    uniform.add(device, shadowUniforms, { V, P: projection });
    uniform.add(device, objectUniforms, {
        V,
        P: projection,
        ...lightingController.values,
        eyePosition,
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
            view: depthStencilTexture.createView(),
            depthLoadOp: "clear",
            depthClearValue: 1,
            depthStoreOp: "store",
            stencilLoadOp: "clear",
            stencilClearValue: 0,
            stencilStoreOp: "store",
        },
    });

    //draw ground once
    pass.setStencilReference(1);
    pass.setPipeline(groundPipeline);
    pass.setVertexBuffer(0, groundVertexBuffer);
    pass.setIndexBuffer(groundIndexBuffer, "uint32");
    pass.setBindGroup(0, groundBindGroup);
    pass.drawIndexed(groundIndices.length);

    pass.setPipeline(shadowPipeline);
    pass.setBindGroup(0, shadowBindGroup);
    for (const batch of objectLists) {
        pass.setVertexBuffer(0, batch.vertexBuffer);
        pass.setVertexBuffer(1, batch.shadowInstanceBuffer);
        pass.setIndexBuffer(batch.indexBuffer, "uint32");
        pass.drawIndexed(batch.shape.getIndices().length, batch.objects.length);
    }

    pass.setPipeline(objectPipeline);
    pass.setBindGroup(0, bindGroup);
    for (const batch of objectLists) {
        pass.setVertexBuffer(0, batch.vertexBuffer);
        pass.setVertexBuffer(1, batch.instanceBuffer);
        pass.setIndexBuffer(batch.indexBuffer, "uint32");
        pass.drawIndexed(batch.shape.getIndices().length, batch.objects.length);
    }
    

    pass.end();
    device.queue.submit([encoder.finish()]);
}

requestAnimationFrame(animate);
