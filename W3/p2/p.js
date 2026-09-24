import { createIndexBuffer } from "./utility/index.js";
import { RenderObject } from "./utility/RenderObject.js";
import { Rectangle3D } from "./utility/shapes/rectangle3D.js";
import * as uniform from "./utility/uniform.js";
import {
    createInstanceBuffer,
    createInstanceBufferLayout,
    createVertexBuffer,
    createVertexBufferLayout
} from "./utility/vertex.js";
;
"use strict";
window.onload = function () {
    main();
}

const device = await createDevice();
const world = {
    min: vec3(-1, -1, -1),
    max: vec3(1, 1, 1)
};

let { canvas, context, canvasFormat } = configureCanvas();


let shaderModule = await createShaderModule("wgsl");
let vertexBufferLayout = createVertexBufferLayout(); //since all are cubes to use one of them for layout.
let instanceBufferLayout = createInstanceBufferLayout();
let pipeline = createPipeline([vertexBufferLayout, instanceBufferLayout]);


let cubeShape = new Rectangle3D();
let cube1 = new RenderObject(cubeShape, vec3(0, -2, 0));
let cube2 = new RenderObject(cubeShape, vec3(0, 0, 0));
let cube3 = new RenderObject(cubeShape, vec3(0, 2, 0));

cube1.rotation = vec3(0, 0, 0);
cube2.rotation = vec3(0, 30, 0);
cube3.rotation = vec3(20, 30, 0);
let cubes = [cube1, cube2, cube3];

let V = lookAt(
    vec3(0, 0, 8),
    vec3(0, 0.5, 0),
    vec3(0, 1, 0)
);

let P = perspective(
    45,
    canvas.width / canvas.height,
    0.01,
    10
);




const vertexBuffer = createVertexBuffer(device, cubeShape.positions);
const instanceBuffer = createInstanceBuffer(device, cubes.map(object => object.getM())); //gives list of model matrices
const indexBuffer = createIndexBuffer(device, cubeShape.indices);

const uniforms = uniform.createBufferAndLayout(
    device,
    [
        { name: "view", type: "mat4" },
        { name: "projection", type: "mat4" },
        { name: "color", type: "vec4" }
    ]
);
const bindGroup = uniform.createBindGroup(device, uniforms.buffer, pipeline);

animate();

function render() {
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            loadOp: 'clear',
            storeOp: 'store',
            clearValue: { r: 0.3921, g: 0.5843, b: 0.9294, a: 1.0 },
        }],
    });

    //Draw objects
    pass.setPipeline(pipeline);

    uniform.add(device, uniforms, {
        view: V,
        projection: P,
        color: vec4(1.0, 0.0, 0.0, 1.0)
    });

    pass.setBindGroup(0, bindGroup);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setVertexBuffer(1, instanceBuffer);
    pass.setIndexBuffer(indexBuffer, 'uint32');
    pass.drawIndexed(cubeShape.indices.length, cubes.length);

    pass.end();
    device.queue.submit([encoder.finish()]);
}


function animate() {
    render();
}

async function main() {
    console.log("hey from main")
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

async function createShaderModule(name) {
    const shaderElement = document.getElementById(name);
    const shaderCode = await fetch(shaderElement.src).then(response => response.text());
    return device.createShaderModule({
        label: "Shader:" + name,
        code: shaderCode
    });
}

function createPipeline(vertexBufferLayouts) {
    if (!Array.isArray(vertexBufferLayouts)) {
        vertexBufferLayouts = [vertexBufferLayouts];
    }

    const pipeline = device.createRenderPipeline({
        layout: 'auto',

        vertex: {
            module: shaderModule,
            entryPoint: 'main_vs',
            buffers: vertexBufferLayouts,
        },

        fragment: {
            module: shaderModule,
            entryPoint: 'main_fs',
            targets: [{ format: canvasFormat }],
        },

        primitive: { topology: 'line-list', },
    });
    return pipeline
}

