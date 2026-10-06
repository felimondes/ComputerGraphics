import * as movement from "./utility/movement.js";
import * as circle from "./utility/objects/circle.js";
import * as uniform from "./utility/uniform.js";
import * as vertex from "./utility/vertex.js";

"use strict";
window.onload = function () {
    main();
}

let device;
const world = {
    min: vec3(-1, -1, -1),
    max: vec3(1, 1, 1)
};
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

function createPipeline(wgsl, positionBufferLayouts, canvasFormat) {

    if (!Array.isArray(positionBufferLayouts)) {
        positionBufferLayouts = [positionBufferLayouts];
    }

    const pipeline = device.createRenderPipeline({
        layout: 'auto',

        vertex: {
            module: wgsl,
            entryPoint: 'main_vs',
            buffers: positionBufferLayouts,
        },

        fragment: {
            module: wgsl,
            entryPoint: 'main_fs',
            targets: [{ format: canvasFormat }],
        },

        primitive: { topology: 'triangle-list', },
    });
    return pipeline
}

function render(context, pipeline, positionBuffer, bindGroup, positions) {

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
    pass.setVertexBuffer(0, positionBuffer);
    pass.setBindGroup(0, bindGroup);
    pass.draw(positions.length);

    pass.end();
    device.queue.submit([encoder.finish()]);

}

function animate(c, context, pipeline, buffer, bindGroup, uniforms) {

    //Make new matrix
    c.rotation = add(c.rotation, c.angularVelocity);
    movement.bounce(c, world);
    let model = c.getModelMatrix()
    
    uniform.add(device, uniforms, {
        model: model
    });

    render(context, pipeline, buffer, bindGroup, c.positions);

    requestAnimationFrame(() =>
        animate(c, context, pipeline, buffer, bindGroup, uniforms)
    );
}

async function main() {

    //Init
    device = await createDevice();
    let { canvas, context, canvasFormat } = configureCanvas();

    // let c = circle.createRandom();
    let c = circle.createRandom();

    //Make vertex and uniform buffers
    let circleBuffer = vertex.createBufferAndLayout(device, c.positions)
    let uniforms = uniform.createBufferAndLayout(device,
        [{ name: "model", type: "mat4" }]);

    //Pipeline
    let shaderModule = await createShaderModule("wgsl");

    let pipeline = createPipeline(shaderModule, [circleBuffer.layout], canvasFormat); //among others: Adding vertex buffers here
    let bindGroup = uniform.createBindGroup(device, uniforms.buffer, pipeline); //Adding uniform buffers here
    uniform.add(device, uniforms, {
        model: c.getModelMatrix()
    });

    //animation
    animate(c, context, pipeline, circleBuffer.buffer, bindGroup, uniforms);
}




