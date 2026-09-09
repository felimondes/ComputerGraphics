import { AnimationController } from "../utility/animationController.js";
import * as movement from "../utility/movement.js";
import * as circle from "../utility/objects/circle.js";
import * as rectangle from "../utility/objects/rectangle.js";
import * as uniform from "../utility/uniform.js";
import * as vertex from "../utility/vertex.js";

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

let c = rectangle.createRandom();

//Make vertex and uniform buffers
let circleBuffer = vertex.createBufferAndLayout(device, c.positions)
let uniforms = uniform.createBufferAndLayout(device,
    [{ name: "model", type: "mat4" }]);


//Pipeline
let shaderModule = await createShaderModule("wgsl");
let pipeline = createPipeline([circleBuffer.layout]);
let bindGroup = uniform.createBindGroup(device, uniforms.buffer, pipeline);
uniform.add(device, uniforms, {
    model: c.getModelMatrix()
});

//Animation
const animationController = new AnimationController( {onStep: animate})
animationController.startLoop();


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

        primitive: { topology: 'triangle-list', },
    });
    return pipeline
}

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

    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, circleBuffer.buffer);
    pass.setBindGroup(0, bindGroup);
    pass.draw(c.positions.length);

    pass.end();
    device.queue.submit([encoder.finish()]);

}

function animate() {
    c.rotation = add(c.rotation, c.angularVelocity);
    movement.bounce(c, world);

    let model = c.getModelMatrix()

    uniform.add(device, uniforms, {
        model: model
    });
    render();
}




