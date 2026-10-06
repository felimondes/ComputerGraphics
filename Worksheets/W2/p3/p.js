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

const clearColors = new Map([
    ["black", { r: 0, g: 0, b: 0, a: 1 }],
    ["red", { r: 1, g: 0, b: 0, a: 1 }],
    ["yellow", { r: 1, g: 1, b: 0, a: 1 }],
    ["green", { r: 0, g: 1, b: 0, a: 1 }],
    ["blue", { r: 0, g: 0, b: 1, a: 1 }],
    ["magenta", { r: 1, g: 0, b: 1, a: 1 }],
    ["cyan", { r: 0, g: 1, b: 1, a: 1 }],
    ["white", { r: 1, g: 1, b: 1, a: 1 }],
    ["blueish", { r: 0.3921, g: 0.5843, b: 0.9294, a: 1 }],
]);
let clearColor = clearColors.get("blueish");

//Create buffer for points
const point_size = 10 * (2 / canvas.height);
var positions = [];
var colors = [];
let drawingMode = "points";
const pendingPoints = [];
let pointBuffer = createVertexBuffer(device, positions);
let pointBufferLayout = createVertexBufferLayout(0, "vec2", "float32x2");

let colorBuffer = createVertexBuffer(device, colors);
let colorBufferLayout = createVertexBufferLayout(1, "vec3", "float32x3");

let pipeline = createPipeline([pointBufferLayout, colorBufferLayout])

canvas.addEventListener("click", handleCanvasClick);
document.getElementById("clear-button").addEventListener("click", clearCanvas);
document.getElementById("point-mode").addEventListener("click", () => setDrawingMode("points"));
document.getElementById("triangle-mode").addEventListener("click", () => setDrawingMode("triangles"));
document.getElementById("clear-color").addEventListener("change", (event) => {
    clearColor = clearColors.get(event.target.value);
    render();
});

render();


function render() {
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            loadOp: 'clear',
            storeOp: 'store',
            clearValue: clearColor,
        }],
    });

    pass.setPipeline(pipeline);

    // uniform.add(device, objectUniforms, {
    //     model: object.getM(),
    //     view: V,
    //     projection: P,
    //     color: vec4(1.0, 0.0, 0.0, 1.0)
    // });

    pass.setVertexBuffer(0, pointBuffer);
    pass.setVertexBuffer(1, colorBuffer);

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

function clearCanvas() {
    positions.length = 0;
    colors.length = 0;
    pendingPoints.length = 0;
    pointBuffer = createVertexBuffer(device, positions);
    colorBuffer = createVertexBuffer(device, colors);
    render();
}

function handleCanvasClick(event) {
    const bounds = canvas.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    const y = 1 - ((event.clientY - bounds.top) / bounds.height) * 2;

    const point = vec2(x, y);
    const pointColor = clearColors.get(document.getElementById("point-color").value);

    if (drawingMode === "points") {
        add_point(positions, colors, point, point_size, pointColor);
    } else {
        pendingPoints.push({ point, color: pointColor });

        if (pendingPoints.length < 3) {
            add_point(positions, colors, point, point_size, pointColor);
        } else {
            const triangleList = pendingPoints.slice();
            removePendingPoints(2);
            add_triangle(positions, colors, triangleList);
            pendingPoints.length = 0;
        }
    }

    pointBuffer = createVertexBuffer(device, positions);
    colorBuffer = createVertexBuffer(device, colors);
    render();
}

function setDrawingMode(mode) {
    if (drawingMode === mode) {
        return;
    }

    removePendingPoints();
    pendingPoints.length = 0;
    drawingMode = mode;
    pointBuffer = createVertexBuffer(device, positions);
    colorBuffer = createVertexBuffer(device, colors);
    render();
}

function removePendingPoints(pointCount) {
    const vertexCount = pointCount * 6;
    positions.splice(positions.length - vertexCount, vertexCount);
    colors.splice(colors.length - vertexCount, vertexCount);
}

function add_triangle(positionArray, colorArray, points) {
    for (const point of points) {
        positionArray.push(point.point);
        colorArray.push(vec3(point.color.r, point.color.g, point.color.b));
    }
}



function add_point(positionArray, colorArray, point, size, color) {
    const offset = size / 2;
    
    const point_coords = [vec2(point[0] - offset, point[1] - offset), vec2(point[0] + offset, point[1] - offset),
    vec2(point[0] - offset, point[1] + offset), vec2(point[0] - offset, point[1] + offset),
    vec2(point[0] + offset, point[1] - offset), vec2(point[0] + offset, point[1] + offset)];
    positionArray.push.apply(positionArray, point_coords);

    for (let i = 0; i < point_coords.length; i++) {
        colorArray.push(vec3(color.r, color.g, color.b));
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
