import { AnimationController } from "./utility/animationController.js";
import { ObjectsController } from "./utility/objectsController.js";
import { UniformGrid } from "./utility/uniformGrid.js";

import * as uniform from "./utility/uniform.js";
import * as vertex from "./utility/vertex.js";

import * as circle from "./utility/objects/circle.js";

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
const sceneObjects = [];
const collisionObjects = []


//Pipeline
let shaderModule = await createShaderModule("wgsl");
let pipeline;


//Animation
new AnimationController({ onStep: animate }).startLoop();

//Adding objects
new ObjectsController({
    onAdd: addObject
});

//Adding objects
const uniformGrid = new UniformGrid(world);

addObject(circle.createRandom())



function addObject(object) {
    const objectBuffer = vertex.createBufferAndLayout(device, object.positions); //Make new buffer everytime - is this bad?

    if (!pipeline) {
        pipeline = createPipeline([objectBuffer.layout]);
    }
    const objectUniforms = uniform.createBufferAndLayout(device,
        [{ name: "model", type: "mat4" }, { name: "color", type: "vec4" }]);
    const bindGroup = uniform.createBindGroup(device, objectUniforms.buffer, pipeline);

    const aabbPositions = createAABBPositions(object.aabb);
    const aabbBuffer = vertex.createBufferAndLayout(device, aabbPositions);

    collisionObjects.push(object);
    sceneObjects.push({
        object,
        buffer: objectBuffer,
        uniforms: objectUniforms,
        bindGroup,
        aabbBuffer,
        aabbPositions
    });
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


    // Draw grid
    pass.setPipeline(gridPipeline);
    uniform.add(device, gridUniforms, {
        model: mat4(),
        color: vec4(1.0, 1.0, 1.0, 1.0)
    });
    pass.setBindGroup(0, gridBindGroup);
    pass.setVertexBuffer(0, gridBuffer.buffer);
    pass.draw(gridPositions.length);


    //Draw objects
    pass.setPipeline(pipeline);

    for (const item of sceneObjects) {
        item.object.rotation = add(item.object.rotation, item.object.angularVelocity);
        item.object.step(world);
    }

    const collisions = uniformGrid.isAABBCollisions(collisionObjects);
    

    const collidedObjectIds = new Set();
    for (const collision of collisions) {
        const { objectA, objectB, normal, overlap } = collision;
        collidedObjectIds.add(objectA.id);
        collidedObjectIds.add(objectB.id);
        objectA.resolveCollision(objectB, { normal, overlap });
    }

    for (const item of sceneObjects) {
        const color = collidedObjectIds.has(item.object.id)
            ? vec4(1.0, 0.0, 0.0, 1.0)
            : vec4(1.0, 1.0, 1.0, 1.0);

        uniform.add(device, item.uniforms, {
            model: item.object.getModelMatrix(),
            color
        });

        pass.setVertexBuffer(0, item.buffer.buffer);
        pass.setBindGroup(0, item.bindGroup);
        pass.draw(item.object.positions.length);
    }

    // Draw AABB outlines
    pass.setPipeline(gridPipeline);
    for (const item of sceneObjects) {
        item.aabbPositions = createAABBPositions(item.object.aabb);

        device.queue.writeBuffer(
            item.aabbBuffer.buffer,
            0,
            flatten(item.aabbPositions)
        );

        uniform.add(device, gridUniforms, {
            model: mat4(),
            color: vec4(1.0, 0.0, 0.0, 1.0)
        });

        pass.setBindGroup(0, gridBindGroup);
        pass.setVertexBuffer(0, item.aabbBuffer.buffer);
        pass.draw(item.aabbPositions.length);
    }

    pass.end();
    device.queue.submit([encoder.finish()]);

}

function animate() {
    render();
}

async function main() {
    console.log("hey from main")
}


function createGridPositions(world, cellSize) {
    const positions = [];

    const minX = world.min[0];
    const maxX = world.max[0];

    const minY = world.min[1];
    const maxY = world.max[1];

    const minZ = world.min[2];
    const maxZ = world.max[2];


    const sizeX = Math.ceil((maxX - minX) / cellSize);
    const sizeY = Math.ceil((maxY - minY) / cellSize);
    const sizeZ = Math.ceil((maxZ - minZ) / cellSize);

    // Vertical lines
    for (let x = 0; x <= sizeX; x++) {
        const px = minX + x * cellSize;

        positions.push(
            vec3(px, minY, 0),
            vec3(px, maxY, 0)
        );
    }

    // Horizontal lines
    for (let y = 0; y <= sizeY; y++) {
        const py = minY + y * cellSize;

        positions.push(
            vec3(minX, py, 0),
            vec3(maxX, py, 0)
        );
    }

    return positions;
}

function createAABBPositions(aabb) {
    const corners = [
        vec3(aabb.min[0], aabb.min[1], aabb.min[2]),
        vec3(aabb.max[0], aabb.min[1], aabb.min[2]),
        vec3(aabb.max[0], aabb.max[1], aabb.min[2]),
        vec3(aabb.min[0], aabb.max[1], aabb.min[2]),
        vec3(aabb.min[0], aabb.min[1], aabb.max[2]),
        vec3(aabb.max[0], aabb.min[1], aabb.max[2]),
        vec3(aabb.max[0], aabb.max[1], aabb.max[2]),
        vec3(aabb.min[0], aabb.max[1], aabb.max[2])
    ];

    const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
    ];

    const positions = [];

    for (const [start, end] of edges) {
        positions.push(corners[start], corners[end]);
    }

    return positions;
}

const gridPositions = createGridPositions(
    world,
    uniformGrid.cellSize
);

const gridBuffer = vertex.createBufferAndLayout(
    device,
    gridPositions
);

const gridUniforms = uniform.createBufferAndLayout(device,
    [{ name: "model", type: "mat4" }, { name: "color", type: "vec4" }]);

let gridPipeline = createGridPipeline(gridBuffer.layout);
const gridBindGroup = uniform.createBindGroup(device, gridUniforms.buffer, gridPipeline);

uniform.add(device, gridUniforms, {
    model: mat4(),
    color: vec4(1.0, 1.0, 1.0, 1.0)
});

function createGridPipeline(positionBufferLayout) {
    return device.createRenderPipeline({
        layout: 'auto',

        vertex: {
            module: shaderModule,
            entryPoint: 'main_vs',
            buffers: [positionBufferLayout],
        },

        fragment: {
            module: shaderModule,
            entryPoint: 'main_fs',
            targets: [{ format: canvasFormat }],
        },

        primitive: {
            topology: 'line-list'
        },
    });
}