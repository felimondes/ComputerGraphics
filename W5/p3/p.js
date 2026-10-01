import { RenderObject } from "./utility/RenderObject.js";
import { OBJShape } from "./utility/shapes/OBJShape.js";
import * as uniform from "./utility/uniform.js";

//Connect to GPU
const device = await createDevice();
let { canvas, context, canvasFormat } = configureCanvas();

//Objects
const objShape_1 = await OBJShape.fromFile(new URL("./suzanne.obj", import.meta.url));
const obj_1 = new RenderObject(objShape_1, vec3(0, 0, 0));

obj_1.rotation = vec3(0, 0, 0);
obj_1.velocity = vec3(0, 0, 0);
obj_1.angularVelocity = vec3(0, 0, 0);
let objects_1 = [obj_1];

//Setup layouts
let vertexBufferLayout = createVertexBufferLayout();
let instanceBufferLayout = createInstanceBufferLayout();

//Setup buffers
let vertexBuffer = createVertexBuffer(device, objShape_1.positions);
const instanceBuffer = createInstanceBuffer(device, objects_1.map(object => object.getM())); //gives list of model matrices
let indexBuffer = createIndexBuffer(device, objShape_1.indices);


//Prepare uniforms
const cameraRadius = 4;
const lightingParameters = {
    kd: 1,
    ks: 0.5,
    s: 32,
    Le: 1,
    La: 0.5,
};

let eyePosition = vec3(0, 0, cameraRadius);
let up = vec3(0, 1, 0) //up = world up. Depending on convention either z or y is up. Here it is y.
let V = lookAt(eyePosition, obj_1.center, up);
let P = perspective(45,canvas.width / canvas.height, 0.01, 100);
const uniforms = uniform.createBufferAndLayout(
    device,
    [
        { name: "V", type: "mat4" },
        { name: "P", type: "mat4" },
        { name: "kd", type: "f32" },
        { name: "ks", type: "f32" },
        { name: "s", type: "f32" },
        { name: "Le", type: "f32" },
        { name: "La", type: "f32" },
        { name: "eyePosition", type: "vec3" },
    ]
);
//Pipeline
const TOPOLOGY = "triangle-list"; //Vertices interpreted as triangles
const SAMPLE_COUNT = 4; //MultiSample anti aliasing MSAA (Make stairs more smooth)
const pipeline = await createPipeline([vertexBufferLayout, instanceBufferLayout]);
const bindGroup = uniform.createBindGroup(device, uniforms.buffer, pipeline);

//MSAA
const msaaTexture = device.createTexture({
    size: { width: canvas.width, height: canvas.height },
    format: canvasFormat,
    sampleCount: SAMPLE_COUNT,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
});

//Depth handling
const depthTexture = device.createTexture({
    size: { width: canvas.width, height: canvas.height },
    format: 'depth24plus',
    sampleCount: SAMPLE_COUNT,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
});

//Orbit / Animation
let previousFrameTime = 0;
let orbiting = true;
let cameraAngle = 0;
const world = {
    min: vec3(-10, -10, -10),
    max: vec3(5, 5, 5)
};
animate();


//Render
//functions

//Layouts

// struct VertexInput {
//     @location(0) position: vec3<f32>,
//     @location(1) normal: vec3<f32>,
//     @location(2) color: vec4<f32>,

// VERTEX BUFFER (changes for each vertex)
// ┌────────────┬────────────┬────────────┐
// │ position   │ normal     │ color      │
// │ 12 bytes   │ 12 bytes   │ 16 bytes   │....
// └────────────┴────────────┴────────────┘
function createVertexBufferLayout() {
    const vertexBufferLayout = {
        arrayStride: 16,
        attributes: [
            {
                format: "float32x4",
                offset: 0,
                shaderLocation: 0,
            },
        ]
    };
    return vertexBufferLayout;
}


// struct VertexInput {
//     ....
//     @location(3) model0: vec4f,
//     @location(4) model1: vec4f,
//     @location(5) model2: vec4f,
//     @location(6) model3: vec4f,
//
// INSTANCE BUFFER (changes for each instance)
// ┌────────────┬────────────┬────────────┬────────────┐
// │ model0     │ model1     │ model2     │ model3     │
// │ 16 bytes   │ 16 bytes   │ 16 bytes   │ 16 bytes   │
// └────────────┴────────────┴────────────┴────────────┘

function createInstanceBufferLayout() {
    return {
        arrayStride: 64,
        stepMode: 'instance', //IMPORTANT - ONLY WORKS PER INSTANCE, so for each object that is rendered. 
        attributes: [
            { format: 'float32x4', offset: 0, shaderLocation: 1 }, //first vector in model matrix
            { format: 'float32x4', offset: 16, shaderLocation: 2 }, //second ...
            { format: 'float32x4', offset: 32, shaderLocation: 3 }, //...
            { format: 'float32x4', offset: 48, shaderLocation: 4 },
        ],
    };
}

function createVertexBuffer(device, positions) {
    const data = positions;

    const vertexBuffer = device.createBuffer({
        size: Math.max(data.byteLength, 4),
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, data);

    return vertexBuffer;
}


function createInstanceBuffer(device, modelMatrices) {
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


async function createShaderModule(name) {
    const shaderElement = document.getElementById(name);
    const shaderCode = await fetch(shaderElement.src).then(response => response.text());
    return device.createShaderModule({
        label: "Shader:" + name,
        code: shaderCode
    });
}

async function createPipeline(layouts) {
    
    let shaderModule = await createShaderModule("wgsl");

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
            format: 'depth24plus',
        },

        multisample: {
            count: SAMPLE_COUNT,
        },

        primitive: {
            topology: TOPOLOGY,
            frontFace: "ccw", // options { "ccw", "cw" }
            cullMode: "back", // options { "none", "front", "back" }
        },
    });
    return pipeline
}


function render() {
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
        colorAttachments: [{
            view: msaaTexture.createView(),
            resolveTarget: context.getCurrentTexture().createView(),
            loadOp: 'clear',
            storeOp: 'store',
            clearValue: { r: 0.3921, g: 0.5843, b: 0.9294, a: 1.0 },
        }],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthLoadOp: 'clear',
            depthClearValue: 1.0,
            depthStoreOp: 'store',
        },
    });

    //Draw objects
    pass.setPipeline(pipeline);

    uniform.add(device, uniforms, {
        V: V,
        P: P,
        ...lightingParameters,
        eyePosition: eyePosition,
    });

    pass.setBindGroup(0, bindGroup);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setVertexBuffer(1, instanceBuffer);
    pass.setIndexBuffer(indexBuffer, 'uint32');
    pass.drawIndexed(objShape_1.indices.length, objects_1.length);

    pass.end();
    device.queue.submit([encoder.finish()]);
}


function animate(timestamp = 0) {
    const deltaTime = previousFrameTime === 0 ? 0 : (timestamp - previousFrameTime) / 1000;
    previousFrameTime = timestamp;

    if (orbiting) {
        cameraAngle += deltaTime;
        eyePosition = vec3(
            cameraRadius * Math.sin(cameraAngle),
            0,
            cameraRadius * Math.cos(cameraAngle)
        );
        V = lookAt(eyePosition, vec3(0, 0, 0), vec3(0, 1, 0));
    }

    for (var object of objects_1) {
        object.step(world)
    }
    device.queue.writeBuffer(
        instanceBuffer,
        0,
        new Float32Array(
            objects_1.flatMap(object => Array.from(flatten(object.getM())))
        )
    );
    render();
    requestAnimationFrame(animate);
}


async function createDevice() {
    const gpu = navigator.gpu;
    const adapter = await gpu.requestAdapter();
    const device = await adapter.requestDevice();
    return device;
}

function configureCanvas() {
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