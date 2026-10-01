import {
    configureCanvas,
    createDevice,
    createIndexBuffer,
    createInstanceBuffer,
    createInstanceBufferLayout,
    createShaderModule,
    createVertexBuffer,
    createVertexBufferLayout
} from "./mostlyClutter/index.js";
import { RenderObject } from "./utility/RenderObject.js";
import { OBJShape } from "./utility/shapes/OBJShape.js";
import * as uniform from "./utility/uniform.js";


import { loadControlPanels } from "./controls/controls.js";
import { OrbitController } from "./controls/orbiting/orbiting.js";
// import { bindLightingControls } from "./controls/lighting/lighting.js";
// import { bindSubdivisionControls } from "./controls/subdivisions/subdivisions.js";
await loadControlPanels();



//Connect to GPU
const device = await createDevice();
let { canvas, context, canvasFormat } = configureCanvas(device);

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


//MSAA
const SAMPLE_COUNT = 4; //MultiSample anti aliasing MSAA (Make stairs more smooth)
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


//Pipeline
const TOPOLOGY = "triangle-list"; //Vertices interpreted as triangles

const pipeline = await createPipeline([vertexBufferLayout, instanceBufferLayout]);
const bindGroup = uniform.createBindGroup(device, uniforms.buffer, pipeline);


const orbit = new OrbitController();



const world = {
    min: vec3(-10, -10, -10),
    max: vec3(5, 5, 5)
};
animate();


//Render
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
    const orbitState = orbit.update(timestamp, cameraRadius);

    if (orbitState) {
        eyePosition = orbitState.eyePosition;
        V = orbitState.viewMatrix;
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

async function createPipeline(layouts) {
    
    let shaderModule = await createShaderModule("wgsl", device);

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