import * as movement from "../utility/movement.js";
import { Circle } from "../utility/objects/circle.js";
import * as uniformVariables from "../utility/uniformVariables.js";

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

function createPositionBufferAndLayout(positions) {

    const positionBuffer = device.createBuffer({
        size: flatten(positions).byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(positionBuffer, /*bufferOffset=*/0, flatten(positions));

    //Vertex buffer layout
    const positionBufferLayout = {
        arrayStride: sizeof['vec3'],
        attributes: [{
            format: 'float32x3',
            offset: 0,
            shaderLocation: 0, // Position, see vertex shader
        }],
    }

    return {
        positionBuffer,
        positionBufferLayout
    }

}

async function createShaderModule() {
    const shaderElement = document.getElementById("wgsl");
    const shaderCode = await fetch(shaderElement.src).then(response => response.text());
    return device.createShaderModule({
        label: "myShader:)",
        code: shaderCode
    });
}

function createPipeline(wgsl, positionBufferLayout, canvasFormat) {
    //Create pipeline
    const pipeline = device.createRenderPipeline({
        layout: 'auto',

        vertex: {
            module: wgsl,
            entryPoint: 'main_vs',
            buffers: [positionBufferLayout],
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

function createBindGroup(uniformBuffer, pipeline) {

    return device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{
            binding: 0,
            resource: { buffer: uniformBuffer }
        }],
    });
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


async function main() {
    //Init
    device = await createDevice();
    let { canvas, context, canvasFormat } = configureCanvas();

    let radius = 0.5;
    let segments = 15;
    let c = new Circle(radius, segments)
    c.theta = 0;
    c.angularVelocity = 1;
    c.velocity = vec3(0.0, 0.01, 0.0);


    let { positionBuffer, positionBufferLayout } = createPositionBufferAndLayout(c.positions)
    let uniforms = uniformVariables.createBuffer(device, [
        {
            name: "model",
            type: "mat4"
        }
    ]);

    let wgsl = await createShaderModule();
    let pipeline = createPipeline(wgsl, positionBufferLayout, canvasFormat);
    let bindGroup = createBindGroup(uniforms.buffer, pipeline);

    
    
    uniformVariables.updateBuffer(device, uniforms, {
        model: c.getModelMatrix()
    });

    movement.bounce(c, world);



    render(context, pipeline, positionBuffer, bindGroup, c.positions);

    //Animation
    function animate() {

        //Update simulation state
        c.theta = c.theta + c.angularVelocity;

        movement.bounce(c, world);

        uniformVariables.updateBuffer(device, uniforms, {
            model: c.getModelMatrix()
        });

        render(context, pipeline, positionBuffer, bindGroup, c.positions);
        requestAnimationFrame(animate);
    }
    animate();


}




