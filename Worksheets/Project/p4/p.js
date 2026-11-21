import * as uniform from "../../utility/uniform.js";
import {
    configureCanvas,
    createBindGroup,
    createDevice,
    createIndexBuffer,
    createInstanceBuffer,
    createInstanceBufferLayout,
    createShaderModule,
    createVertexBuffer,
    createVertexBufferLayout
} from "./mostlyClutter/index.js";

import { BoundsController } from "../../controls/bounds/bounds.js";
import { CameraController } from "../../controls/camera/camera.js";
import { SweepAndPrune } from "../../utility/collision/sweepAndPrune.js";
import { loadControlPanels } from "../../controls/controls.js";
import { LightingController } from "../../controls/lighting/lighting.js";
import { SceneController } from "../../controls/scene/scene.js";
import { RenderObject } from "../../utility/RenderObject.js";
import { Quad } from "../../utility/shapes/quad.js";
await loadControlPanels();


const world = {
    min: vec3(-3, -3, -3),
    max: vec3(3, 3, 3)
};


//Connect to GPU
const device = await createDevice();
let { canvas, context, canvasFormat } = configureCanvas(device);


//Controls
const cameraController = new CameraController(
    canvas,
    new URL("./camera.html", import.meta.url)
);
const lightingController = new LightingController(
    new URL("./lighting.html", import.meta.url)
);
const sceneController = new SceneController(isRunning => {
    if (isRunning) {
        cameraController.previousFrameTime = 0;
    }
});






await Promise.all([
    cameraController.ready,
    lightingController.ready,
]);
cameraController.setView(vec3(0, 0, 9), vec3(0, 0, 0));
const sweepAndPrune = new SweepAndPrune(3);

const quadShape = new Quad();
const leftQuad = new RenderObject(quadShape, vec3(-1, 0, 0));
leftQuad.scalingFactor = vec3(0.5, 0.5, 0.5);
leftQuad.velocity = vec3(1 / 4, 0, 0);

const rightQuad = new RenderObject(quadShape, vec3(1, 0, 0));
rightQuad.scalingFactor = vec3(0.25, 0.25, 0.25);
rightQuad.velocity = vec3(-0.25, 0, 0);

const objectLists = [{
    id: "quad",
    label: "Quad",
    objects: [leftQuad, rightQuad],
    shape: quadShape,
}];


//Setup buffers
for (const batch of objectLists) {
    batch.vertexBuffer = createVertexBuffer(
        device,
        batch.shape.getPositions(),
        batch.shape.getNormals()
    );
    batch.instanceBufferCapacity = Math.max(1, batch.objects.length);
    batch.instanceBuffer = createInstanceBuffer(
        device,
        batch.objects.length
            ? batch.objects.map(object => object.getM())
            : [mat4()]
    );
    batch.indexBuffer = createIndexBuffer(device, batch.shape.getIndices());
}

function updateInstanceBuffer(batch) {
    if (batch.objects.length > batch.instanceBufferCapacity) {
        const oldBuffer = batch.instanceBuffer;
        batch.instanceBufferCapacity = Math.max(
            batch.instanceBufferCapacity * 2,
            batch.objects.length
        );
        batch.instanceBuffer = device.createBuffer({
            size: batch.instanceBufferCapacity * 80,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.onSubmittedWorkDone().then(() => oldBuffer.destroy());
    }

    if (batch.objects.length === 0) {
        return;
    }

    device.queue.writeBuffer(
        batch.instanceBuffer,
        0,
        new Float32Array(
            batch.objects.flatMap(object => [
                ...Array.from(flatten(object.getM())),
                ...(object.isColliding ? [1, 0, 0, 1] : [1, 1, 1, 1]),
            ])
        )
    );
}

//Setup layouts
let vertexBufferLayout = createVertexBufferLayout();
let instanceBufferLayout = createInstanceBufferLayout();


//Prepare uniforms

let eyePosition = vec3(
    cameraController.values.eyeX,
    cameraController.values.eyeY,
    cameraController.values.eyeZ
);
let up = vec3(0, 1, 0) //up = world up. Depending on convention either z or y is up. Here it is y.
let V = cameraController.V;
let P = perspective(45, canvas.width / canvas.height, 0.01, 100);
const objectUniforms = uniform.createBufferAndLayout(
    device,
    [
        { name: "V", type: "mat4" },
        { name: "P", type: "mat4" },
        { name: "kd", type: "f32" },
        { name: "ks", type: "f32" },
        { name: "s", type: "f32" },
        { name: "Le", type: "f32" },
        { name: "La", type: "f32" },
        { name: "eyePosition", type: "vec3" },
    ]
);


//MSAA
const SAMPLE_COUNT = 4; //MultiSample anti aliasing MSAA (Make stairs more smooth)
const msaaTexture = device.createTexture({
    size: { width: canvas.width, height: canvas.height },
    format: canvasFormat,
    sampleCount: SAMPLE_COUNT,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
});

//Depth handling
const depthTexture = device.createTexture({
    size: { width: canvas.width, height: canvas.height },
    format: 'depth24plus',
    sampleCount: SAMPLE_COUNT,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
});


//Pipeline
const TOPOLOGY = "triangle-list"; //Vertices interpreted as triangles

const objectPipeline = await createPipeline([vertexBufferLayout, instanceBufferLayout]);
const bindGroup = createBindGroup(device, objectUniforms.buffer, objectPipeline);




const gridPositions = createWorldGrid(world, 2);
const gridVertexBuffer = device.createBuffer({
    size: gridPositions.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(gridVertexBuffer, 0, gridPositions);

const gridUniforms = uniform.createBufferAndLayout(device, [
    { name: "V", type: "mat4" },
    { name: "P", type: "mat4" },
]);
const gridShader = device.createShaderModule({
    label: "World grid shader",
    code: `
        struct GridUniforms {
            V: mat4x4f,
            P: mat4x4f,
        };

        @group(0) @binding(0)
        var<uniform> uniforms: GridUniforms;

        @vertex
        fn main_vs(@location(0) position: vec3f) -> @builtin(position) vec4f {
            return uniforms.P * uniforms.V * vec4f(position, 1.0);
        }

        @fragment
        fn main_fs() -> @location(0) vec4f {
            return vec4f(0.12, 0.22, 0.32, 1.0);
        }
    `,
});
const gridPipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
        module: gridShader,
        entryPoint: "main_vs",
        buffers: [{
            arrayStride: 12,
            attributes: [{ format: "float32x3", offset: 0, shaderLocation: 0 }],
        }],
    },
    fragment: {
        module: gridShader,
        entryPoint: "main_fs",
        targets: [{ format: canvasFormat }],
    },
    primitive: { topology: "line-list" },
    depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: false,
        depthCompare: "less-equal",
    },
    multisample: { count: SAMPLE_COUNT },
});
const gridBindGroup = device.createBindGroup({
    layout: gridPipeline.getBindGroupLayout(0),
    entries: [{
        binding: 0,
        resource: { buffer: gridUniforms.buffer },
    }],
});

const boundsController = new BoundsController(device, canvasFormat, {
    dimensions: 2,
    sampleCount: SAMPLE_COUNT,
    onChange: () => render(),
});

requestAnimationFrame(animate);

function createWorldGrid(bounds, spacing) {
    const vertices = [];
    for (
        let x = bounds.min[0];
        x <= bounds.max[0];
        x += spacing
    ) {
        vertices.push(x, bounds.min[1], 0, x, bounds.max[1], 0);
    }
    for (
        let y = bounds.min[1];
        y <= bounds.max[1];
        y += spacing
    ) {
        vertices.push(bounds.min[0], y, 0, bounds.max[0], y, 0);
    }

    return new Float32Array(vertices);
}

//Render
function render() {
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
        colorAttachments: [{
            view: msaaTexture.createView(),
            resolveTarget: context.getCurrentTexture().createView(),
            loadOp: 'clear',
            storeOp: 'store',
            clearValue: { r: 0.3921, g: 0.5843, b: 0.9294, a: 1.0 },
        }],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthLoadOp: 'clear',
            depthClearValue: 1.0,
            depthStoreOp: 'store',
        },
    });

    uniform.add(device, gridUniforms, { V, P });
    pass.setPipeline(gridPipeline);
    pass.setBindGroup(0, gridBindGroup);
    pass.setVertexBuffer(0, gridVertexBuffer);
    pass.draw(gridPositions.length / 3);

    pass.setPipeline(objectPipeline);

    uniform.add(device, objectUniforms, {
        V: V,
        P: P,
        ...lightingController.values,
        eyePosition: eyePosition,
    });
    pass.setBindGroup(0, bindGroup);
    for (const batch of objectLists) {
        if (batch.objects.length === 0) {
            continue;
        }

        pass.setVertexBuffer(0, batch.vertexBuffer);
        pass.setVertexBuffer(1, batch.instanceBuffer);
        pass.setIndexBuffer(batch.indexBuffer, 'uint32');
        pass.drawIndexed(batch.shape.getIndices().length, batch.objects.length);
    }

    boundsController.draw(pass, objectLists, V, P);
    pass.end();
    device.queue.submit([encoder.finish()]);
}

function animate(timestamp = 0) {
    const orbitState = cameraController.update(timestamp);
    if (orbitState) {
        eyePosition = orbitState.eyePosition;
        V = orbitState.viewMatrix;
    } else {
        const nextEyePosition = vec3(
            cameraController.values.eyeX,
            cameraController.values.eyeY,
            cameraController.values.eyeZ
        );

        try {
            const nextViewMatrix = lookAt(
                nextEyePosition,
                vec3(0, 0, 0),
                up
            );
            if (!nextViewMatrix.flat().every(Number.isFinite)) {
                throw new Error("lookAt produced an invalid view matrix.");
            }

            eyePosition = nextEyePosition;
            V = nextViewMatrix;
        } catch (error) {
            console.error("lookAt failed; keeping the previous camera view:", error);
        }
    }

    if (sceneController.isRunning) {
        for (const batch of objectLists) {
            for (const object of batch.objects) {
                object.step(world);
            }
        }
        sweepAndPrune.update(objectLists.flatMap(batch => batch.objects));
        for (const batch of objectLists) {
            updateInstanceBuffer(batch);
        }
    }
    render();
    requestAnimationFrame(animate);
}

async function createPipeline(layouts) {

    let shaderModule = await createShaderModule("wgsl", device);

    const pipeline = device.createRenderPipeline({
        layout: 'auto',

        vertex: {
            module: shaderModule,
            entryPoint: 'main_vs',
            buffers: layouts, //instance and vertex layouts go in here
        },

        fragment: {
            module: shaderModule,
            entryPoint: 'main_fs',
            targets: [{ format: canvasFormat }],
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        },

        multisample: {
            count: SAMPLE_COUNT,
        },

        primitive: {
            topology: TOPOLOGY,
            frontFace: "ccw", // options { "ccw", "cw" }
            cullMode: "back", // options { "none", "front", "back" }
        },
    });
    return pipeline
}