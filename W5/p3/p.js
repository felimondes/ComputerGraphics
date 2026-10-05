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
import { SubdivisionController } from "./controls/subdivisions/subdivisions.js";
import { ValueSliderController } from "./controls/valueSliders/valueSliders.js";
import { Sphere } from "./utility/shapes/sphere.js";
await loadControlPanels();



//Connect to GPU
const device = await createDevice();
let { canvas, context, canvasFormat } = configureCanvas(device);

//Objects (make better later)
const objShape_1 = await OBJShape.fromFile(new URL("./suzanne.obj", import.meta.url));
const obj_1_1 = new RenderObject(objShape_1, vec3(3, 0, 0));
let objects_1 = [obj_1_1];


const objShape_2 = new Sphere(0);
const obj_2_1 = new RenderObject(objShape_2, vec3(0, 0, 0));
let objects_2 = [obj_2_1];

const objectLists = [
    { objects: objects_1, shape: objShape_1 },
    { objects: objects_2, shape: objShape_2 },
];

//Controls
const orbit = new OrbitController();
new SubdivisionController(objectLists, device);
const valueSliders = new ValueSliderController();


//Setup buffers
for (const batch of objectLists) {
    batch.vertexBuffer = createVertexBuffer(device, batch.shape.positions, batch.shape.normals);
    batch.instanceBuffer = createInstanceBuffer(
        device,
        batch.objects.map(object => object.getM())
    );
    batch.indexBuffer = createIndexBuffer(device, batch.shape.indices);
}


//Setup layouts
let vertexBufferLayout = createVertexBufferLayout();
let instanceBufferLayout = createInstanceBufferLayout();


//Prepare uniforms

let eyePosition = vec3(
    valueSliders.values.eyeX,
    valueSliders.values.eyeY,
    valueSliders.values.eyeZ
);
const cameraRadius = Math.hypot(
        valueSliders.values.eyeX,
        valueSliders.values.eyeZ
    );
let up = vec3(0, 1, 0) //up = world up. Depending on convention either z or y is up. Here it is y.
let V = lookAt(eyePosition, obj_1_1.center, up);
let P = perspective(45, canvas.width / canvas.height, 0.01, 100);
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

const world = {
    min: vec3(-10, -10, -10),
    max: vec3(10, 10, 10)
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

    pass.setPipeline(pipeline);

    uniform.add(device, uniforms, {
        V: V,
        P: P,
        ...valueSliders.values,
        eyePosition: eyePosition,
    });

    pass.setBindGroup(0, bindGroup);
    for (const batch of objectLists) {
        pass.setVertexBuffer(0, batch.vertexBuffer);
        pass.setVertexBuffer(1, batch.instanceBuffer);
        pass.setIndexBuffer(batch.indexBuffer, 'uint32');
        pass.drawIndexed(batch.shape.indices.length, batch.objects.length);
    }

    pass.end();
    device.queue.submit([encoder.finish()]);
}

function animate(timestamp = 0) {

    const orbitState = orbit.update(timestamp, Math.max(cameraRadius, 0.01));
    if (orbitState) {
        eyePosition = orbitState.eyePosition;
        V = orbitState.viewMatrix;
    } else {
        eyePosition = vec3(
            valueSliders.values.eyeX,
            valueSliders.values.eyeY,
            valueSliders.values.eyeZ
        );
        V = lookAt(eyePosition, vec3(0, 0, 0), up);
    }

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