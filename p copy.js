import { createIndexBuffer } from "./utility/index.js";
import { RenderObject } from "./W5/p3/utility/RenderObject.js";
import { Sphere } from "./W5/p3/utility/shapes/sphere.js";
import * as uniform from "./W5/p3/utility/uniform.js";
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

// const world = {
//     min: vec3(-1, -1, -1),
//     max: vec3(1, 1, 1)
// };

const world = {
    min: vec3(-10, -10, -10),
    max: vec3(5, 5, 5)
};

// const TOPOLOGY = "triangle-list"
// const SAMPLE_COUNT = 4; //MultiSample anti aliasing MSAA (Make stairs more smooth)
const MIN_SUBDIVISION = 0;
const MAX_SUBDIVISION = 6;
let subdivisionLevel = 0;

// let cameraAngle = 0;
// let orbiting = false;
// let previousFrameTime = 0;


// const device = await createDevice();
// let { canvas, context, canvasFormat } = configureCanvas();

// const msaaTexture = device.createTexture({
//     size: { width: canvas.width, height: canvas.height },
//     format: canvasFormat,
//     sampleCount: SAMPLE_COUNT,
//     usage: GPUTextureUsage.RENDER_ATTACHMENT,
// });

// const depthTexture = device.createTexture({
//     size: { width: canvas.width, height: canvas.height },
//     format: 'depth24plus',
//     sampleCount: SAMPLE_COUNT,
//     usage: GPUTextureUsage.RENDER_ATTACHMENT,
// });

// let shaderModule = await createShaderModule("wgsl");

// let positionBufferLayout = createVertexBufferLayout('vec3', 'float32x3', 0); //since all are cubes to use one of them for layout.
// let instanceBufferLayout = createInstanceBufferLayout();

// let pipeline = createPipeline([
//     positionBufferLayout,
//     instanceBufferLayout
// ]);


// let sphereShape = new Sphere(subdivisionLevel);
// let sphere = new RenderObject(sphereShape, vec3(0, 0, 0));

// sphere.rotation = vec3(0, 0, 0);
// sphere.velocity = vec3(0, 0, 0);
// sphere.angularVelocity = vec3(0, 0, 0);
// let spheres = [sphere];

// let V = lookAt(
//     vec3(0, 0, cameraRadius),
//     vec3(0, 0, 0),
//     vec3(0, 1, 0)
// );

// let P = perspective(
//     45,
//     canvas.width / canvas.height,
//     0.01,
//     100
// );

// let vertexBuffer = createVertexBuffer(device, sphereShape.positions);
// const instanceBuffer = createInstanceBuffer(device, spheres.map(object => object.getM())); //gives list of model matrices
// let indexBuffer = createIndexBuffer(device, sphereShape.indices);

// const uniforms = uniform.createBufferAndLayout(
//     device,
//     [
//         { name: "view", type: "mat4" },
//         { name: "projection", type: "mat4" },
//         { name: "kd", type: "f32" },
//         { name: "ks", type: "f32" },
//         { name: "s", type: "f32" },
//         { name: "Le", type: "f32" },
//         { name: "La", type: "f32" },
//         { name: "cameraPosition", type: "vec3" },
//     ]
// );
// const bindGroup = uniform.createBindGroup(device, uniforms.buffer, pipeline);

// animate();

document.getElementById("decrease-subdivision").addEventListener("click", () => {
    setSubdivisionLevel(subdivisionLevel - 1);
});
document.getElementById("increase-subdivision").addEventListener("click", () => {
    setSubdivisionLevel(subdivisionLevel + 1);
});

const orbitButton = document.getElementById("toggle-orbit");
orbitButton.addEventListener("click", () => {
    orbiting = !orbiting;
    orbitButton.textContent = orbiting ? "Stop orbit" : "Start orbit";
});

for (const [inputId, parameterName, outputId] of [
    ["kd", "kd", "kd-value"],
    ["ks", "ks", "ks-value"],
    ["shininess", "s", "shininess-value"],
    ["Le", "Le", "Le-value"],
    ["La", "La", "La-value"],
]) {
    const input = document.getElementById(inputId);
    const output = document.getElementById(outputId);
    input.addEventListener("input", () => {
        const value = Number(input.value);
        lightingParameters[parameterName] = value;
        output.value = parameterName === "s" ? value : value.toFixed(2);
        render();
    });
}

function setSubdivisionLevel(level) {
    subdivisionLevel = Math.max(
        MIN_SUBDIVISION,
        Math.min(MAX_SUBDIVISION, level)
    );

    sphereShape = new Sphere(subdivisionLevel);
    vertexBuffer = createVertexBuffer(device, sphereShape.positions);
    indexBuffer = createIndexBuffer(device, sphereShape.indices);
    document.getElementById("subdivision-level").textContent =
        `Subdivision level: ${subdivisionLevel}`;

    render();
}

// function render() {
//     const encoder = device.createCommandEncoder();
//     const pass = encoder.beginRenderPass({
//         colorAttachments: [{
//             view: msaaTexture.createView(),
//             resolveTarget: context.getCurrentTexture().createView(),
//             loadOp: 'clear',
//             storeOp: 'store',
//             clearValue: { r: 0.3921, g: 0.5843, b: 0.9294, a: 1.0 },
//         }],
//         depthStencilAttachment: {
//             view: depthTexture.createView(),
//             depthLoadOp: 'clear',
//             depthClearValue: 1.0,
//             depthStoreOp: 'store',
//         },
//     });

//     //Draw objects
//     pass.setPipeline(pipeline);

//     uniform.add(device, uniforms, {
//         view: V,
//         projection: P,
//         ...lightingParameters,
//         cameraPosition: eye,
//     });

//     pass.setBindGroup(0, bindGroup);
//     pass.setVertexBuffer(0, vertexBuffer);
//     pass.setVertexBuffer(1, instanceBuffer);
//     pass.setIndexBuffer(indexBuffer, 'uint32');
//     pass.drawIndexed(sphereShape.indices.length, spheres.length);

//     pass.end();
//     device.queue.submit([encoder.finish()]);
// }

// function animate(timestamp = 0) {
//     const deltaTime = previousFrameTime === 0 ? 0 : (timestamp - previousFrameTime) / 1000;
//     previousFrameTime = timestamp;

//     if (orbiting) {
//         cameraAngle += deltaTime;
//         eye = vec3(
//             cameraRadius * Math.sin(cameraAngle),
//             0,
//             cameraRadius * Math.cos(cameraAngle)
//         );
//         V = lookAt(eye, vec3(0, 0, 0), vec3(0, 1, 0));
//     }

//     sphere.step(world);
//     device.queue.writeBuffer(
//         instanceBuffer,
//         0,
//         new Float32Array(
//             spheres.flatMap(object => Array.from(flatten(object.getM())))
//         )
//     );
//     render();
//     requestAnimationFrame(animate);
// }

async function main() {
    console.log("hey from main")
}

// async function createDevice() {
//     const gpu = navigator.gpu;
//     const adapter = await gpu.requestAdapter();
//     const device = await adapter.requestDevice();
//     return device;
// }

// function configureCanvas() {
//     const canvas = document.getElementById('my-canvas');
//     const context = canvas.getContext('webgpu');
//     const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
//     context.configure({
//         device: device,
//         format: canvasFormat,
//     });
//     return {
//         canvas,
//         context,
//         canvasFormat
//     }
// }

// async function createShaderModule(name) {
//     const shaderElement = document.getElementById(name);
//     const shaderCode = await fetch(shaderElement.src).then(response => response.text());
//     return device.createShaderModule({
//         label: "Shader:" + name,
//         code: shaderCode
//     });
// }

// function createPipeline(vertexBufferLayouts) {
//     if (!Array.isArray(vertexBufferLayouts)) {
//         vertexBufferLayouts = [vertexBufferLayouts];
//     }

//     const pipeline = device.createRenderPipeline({
//         layout: 'auto',

//         vertex: {
//             module: shaderModule,
//             entryPoint: 'main_vs',
//             buffers: vertexBufferLayouts,
//         },

//         fragment: {
//             module: shaderModule,
//             entryPoint: 'main_fs',
//             targets: [{ format: canvasFormat }],
//         },
//         depthStencil: {
//             depthWriteEnabled: true,
//             depthCompare: 'less',
//             format: 'depth24plus',
//         },

//         multisample: {
//             count: SAMPLE_COUNT,
//         },

//         primitive: {
//             topology: TOPOLOGY,
//             frontFace: "ccw", // options { "ccw", "cw" }
//             cullMode: "back", // options { "none", "front", "back" }
//         },
//     });
//     return pipeline
// }

