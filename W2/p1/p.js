// import { createIndexBuffer } from "./utility/index.js";
// import { RenderObject } from "./utility/RenderObject.js";
// import { Rectangle3D } from "./utility/shapes/rectangle3D.js";
// import * as uniform from "./utility/uniform.js";
import {
    createVertexBuffer,
    createVertexBufferLayout
} from "./utility/vertex.js";
// ;

//CONSTANTS:
let TOPOLOGY = "triangle-list"

"use strict";
window.onload = function () {
    main();
}

const device = await createDevice();
let { canvas, context, canvasFormat } = configureCanvas();
let shaderModule = await createShaderModule("wgsl");


//Create buffer for points
const point_size = 10 * (2 / canvas.height);
var positions = [];
let vertexBuffer = createVertexBuffer(device, positions);
let vertexBufferLayout = createVertexBufferLayout();


let pipeline = createPipeline([vertexBufferLayout])

canvas.addEventListener("click", handleCanvasClick);

render();


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

    // uniform.add(device, objectUniforms, {
    //     model: object.getM(),
    //     view: V,
    //     projection: P,
    //     color: vec4(1.0, 0.0, 0.0, 1.0)
    // });

    pass.setVertexBuffer(0, vertexBuffer);

    pass.draw(positions.length);


    // pass.setIndexBuffer(
    //     indexBuffer,
    //     'uint32'
    // );
    // pass.drawIndexed(
    //     wireIndices.length
    // );

    pass.end();
    device.queue.submit([encoder.finish()]);

}

function handleCanvasClick(event) {
    const bounds = canvas.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    const y = 1 - ((event.clientY - bounds.top) / bounds.height) * 2;

    add_point(positions, vec2(x, y), point_size);
    vertexBuffer = createVertexBuffer(device, positions);
    render();
}



function add_point(array, point, size) {
    const offset = size / 2;
    var point_coords = [vec2(point[0] - offset, point[1] - offset), vec2(point[0] + offset, point[1] - offset),
    vec2(point[0] - offset, point[1] + offset), vec2(point[0] - offset, point[1] + offset),
    vec2(point[0] + offset, point[1] - offset), vec2(point[0] + offset, point[1] + offset)];
    array.push.apply(array, point_coords); //adds all 6 points to array
}


// const objectUniforms = uniform.createBufferAndLayout(
//     device,
//     [
//         { name: "model", type: "mat4" },
//         { name: "view", type: "mat4" },
//         { name: "projection", type: "mat4" },
//         { name: "color", type: "vec4" }
//     ]
// );

// const bindGroup = uniform.createBindGroup(device, objectUniforms.buffer, pipeline);


// let V = lookAt(
//     vec3(3, 3, 3),
//     vec3(0.5, 0.5, 0.5),
//     vec3(0, 1, 0)
// );

// const P = ortho(
//     -2, 2,
//     -2, 2,
//     -10, 10
// );


// animate();


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

        primitive: { topology: TOPOLOGY, },
    });
    return pipeline
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
