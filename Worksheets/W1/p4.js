"use strict";
window.onload = function () { main(); }



async function createDevice() {
    const gpu = navigator.gpu;
    const adapter = await gpu.requestAdapter();
    const device = await adapter.requestDevice();
    return device;
}

function configureCanvas(device) {

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

function createUniformBuffer(device, theta) {

    let bytelength = sizeof['vec4']; // Buffers are allocated in vec4 chunks
    let uniforms = new ArrayBuffer(bytelength);
    new Float32Array(uniforms, 0, 1).set([theta]);

    const uniformBuffer = device.createBuffer({
        size: uniforms.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(uniformBuffer, 0, uniforms);

    return {
        bytelength,
        uniforms,
        uniformBuffer
    }
}

function createPositionBufferAndLayout(device) {

    //Create buffer for points
    var positions = [
        vec2(0, 0.5), vec2(-0.5, 0), vec2(0.5, 0), vec2(0, -0.5)
    ];

    const positionBuffer = device.createBuffer({
        size: flatten(positions).byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(positionBuffer, /*bufferOffset=*/0, flatten(positions));

    //Vertex buffer layout
    const positionBufferLayout = {
        arrayStride: sizeof['vec2'],
        attributes: [{
            format: 'float32x2',
            offset: 0,
            shaderLocation: 0, // Position, see vertex shader
        }],
    }

    return {
        positions,
        positionBuffer,
        positionBufferLayout
    }

}

async function createShaderModule(device) {
    const shaderElement = document.getElementById("wgsl");
    const shaderCode = await fetch(shaderElement.src).then(response => response.text());
    return device.createShaderModule({
        label: "myShader:)",
        code: shaderCode
    });
}

function createPipeline(device, wgsl, positionBufferLayout, canvasFormat) {
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

        primitive: { topology: 'triangle-strip', },
    });
    return pipeline
}

function createBindGroup(device, uniformBuffer, pipeline) {

    return device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{
            binding: 0,
            resource: { buffer: uniformBuffer }
        }],
    });
}

function render(device, context, pipeline, positionBuffer, bindGroup, positions) {

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

function orbitalAngularVelocity(theta_t0, w = 0.01) { //1 radians per change
    var theta_t1 = theta_t0 + w
    return theta_t1;
}


function updateUniformBuffer(device, uniformBuffer, theta) {
    const uniforms = new Float32Array([theta]);
    device.queue.writeBuffer(
        uniformBuffer,
        0,
        uniforms
    );
}

async function main() {
    let device = await createDevice();
    let { canvas, context, canvasFormat } = configureCanvas(device);
    let { positions, positionBuffer, positionBufferLayout } = createPositionBufferAndLayout(device) //layout and buffer stem from the same thing, so its ok to make them together i believe.
    let wgsl = await createShaderModule(device);
    let pipeline = createPipeline(device, wgsl, positionBufferLayout, canvasFormat);

    let theta = Math.PI / 4;
    let {byteLength, uniforms, uniformBuffer } = createUniformBuffer(device, theta);
    let bindGroup = createBindGroup(device, uniformBuffer, pipeline);

    function animate() {
        theta = orbitalAngularVelocity(theta, 0.01);
        updateUniformBuffer(device, uniformBuffer, theta);

        render(device, context, pipeline, positionBuffer, bindGroup, positions); 
        requestAnimationFrame(animate); 
    }
    animate();
}




