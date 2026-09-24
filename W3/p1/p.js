import * as index from "./utility/index.js";
import { Rectangle3D } from "./utility/objects/rectangle3d.js";
import * as uniform from "./utility/uniform.js";
import * as vertex from "./utility/vertex.js";

"use strict";
window.onload = function () {
    main();
}

const device = await createDevice();


let { canvas, context, canvasFormat } = configureCanvas();


let shaderModule = await createShaderModule("wgsl");


let object = new Rectangle3D(vec3(0, 0, 0));
const wireIndices = new Uint32Array([
    // front
    0, 1,
    1, 2,
    2, 3,
    3, 0,

    // back
    4, 5,
    5, 6,
    6, 7,
    7, 4,

    // sides
    0, 4,
    1, 5,
    2, 6,
    3, 7
]);


const objectBuffer = vertex.createBufferAndLayout(device, object.positions);
const indexBuffer = index.createIndexBuffer(device, wireIndices);

let pipeline = createPipeline([objectBuffer.layout])

const objectUniforms = uniform.createBufferAndLayout(
    device,
    [
        { name: "model", type: "mat4" },
        { name: "view", type: "mat4" },
        { name: "projection", type: "mat4" },
        { name: "color", type: "vec4" }
    ]
);

const bindGroup = uniform.createBindGroup(device, objectUniforms.buffer, pipeline);


let V = lookAt(
    vec3(3, 3, 3),
    vec3(0.5, 0.5, 0.5),
    vec3(0, 1, 0)
);

const P = ortho(
    -2, 2,
    -2, 2,
    -10, 10
);


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

    uniform.add(device, objectUniforms, {
        model: object.getM(),
        view: V,
        projection: P,
        color: vec4(1.0, 0.0, 0.0, 1.0)
    });

    pass.setBindGroup(0, bindGroup);
    pass.setVertexBuffer(0, objectBuffer.buffer);

    
    pass.setIndexBuffer(
        indexBuffer,
        'uint32'
    );
    pass.drawIndexed(
        wireIndices.length
    );
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

function createPipeline(positionBufferLayouts) {
    if (!Array.isArray(positionBufferLayouts)) {
        positionBufferLayouts = [positionBufferLayouts];
    }

    const pipeline = device.createRenderPipeline({
        layout: 'auto',

        vertex: {
            module: shaderModule,
            entryPoint: 'main_vs',
            buffers: positionBufferLayouts,
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

