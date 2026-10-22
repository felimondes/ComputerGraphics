import { RenderObject } from "../../utility/RenderObject.js";
import * as uniform from "../../utility/uniform.js";
import {
    configureCanvas,
    createDevice,
    createShaderModule
} from "./mostlyClutter/index.js";

import { CameraController } from "../../controls/camera/camera.js";
import { loadControlPanels } from "../../controls/controls.js";
import { TexturesController } from "../../controls/textures/textures.js";
import { Rectangle } from "../../utility/shapes/rectangle.js";
import { Sphere } from "../../utility/shapes/sphere.js";
await loadControlPanels();



//Connect to GPU
const device = await createDevice();
let { canvas, context, canvasFormat } = configureCanvas(device);



let points = [vec4(-1, -1, 0.999, 1), vec4(1, -1, 0.999, 1), vec4(-1, 1, 0.999, 1), vec4(1, 1, 0.999, 1)]
const backgroundShape = new Rectangle(points);

//Objects
const objShape_2 = new Sphere(5);
const obj_2_1 = new RenderObject(objShape_2, vec3(0, 0, 0));
let objects_2 = [obj_2_1];
const objectLists = [
    { objects: objects_2, shape: objShape_2 }
];

//Controls
const cameraController = new CameraController(canvas);


//Setup layouts
let vertexBufferLayout = {
    arrayStride: 16 + 16,
    attributes: [
        {
            format: "float32x4",
            offset: 0,
            shaderLocation: 0,
        },
        {
            format: "float32x4",
            offset: 16,
            shaderLocation: 1,
        },
    ]
};


let instanceBufferLayout = {
    arrayStride: 64,
    stepMode: 'instance', //IMPORTANT - ONLY WORKS PER INSTANCE, so for each object that is rendered. 
    attributes: [
        { format: 'float32x4', offset: 0, shaderLocation: 2 }, //first vector in model matrix
        { format: 'float32x4', offset: 16, shaderLocation: 3 }, //second ...
        { format: 'float32x4', offset: 32, shaderLocation: 4 }, //...
        { format: 'float32x4', offset: 48, shaderLocation: 5 },
    ],
};



//Setup buffers

//for background
function createVertexData(shape) {
    const positions = shape.getPositions();
    const normals = shape.getNormals();
    const data = new Float32Array(positions.length + normals.length);

    for (let i = 0; i < positions.length / 4; i++) {
        const vertexOffset = i * 8;
        const attributeOffset = i * 4;
        data.set(positions.subarray(attributeOffset, attributeOffset + 4), vertexOffset);
        data.set(normals.subarray(attributeOffset, attributeOffset + 4), vertexOffset + 4);
    }

    return data;
}

const backgroundVertexData = createVertexData(backgroundShape);
const backgroundVertexBuffer = device.createBuffer({
    size: Math.max(backgroundVertexData.byteLength, 4),
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(backgroundVertexBuffer, 0, backgroundVertexData);

const backgroundInstanceBuffer = device.createBuffer({
    size: 64,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(backgroundInstanceBuffer, 0, new Float32Array(flatten(mat4())));

const backgroundIndexBuffer = device.createBuffer({
    size: backgroundShape.getIndices().byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(backgroundIndexBuffer, 0, backgroundShape.getIndices());


//For objects
for (const batch of objectLists) {
    //Vertex Buffers
    const data = createVertexData(batch.shape);
    let vertexBuffer = batch.vertexBuffer = device.createBuffer({
        size: Math.max(data.byteLength, 4),
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, data);


    //Instance buffers
    let modelMatrices = batch.objects.map(object => object.getM());


    const data1 = new Float32Array(
        modelMatrices.flatMap(model => Array.from(flatten(model)))
    );
    const instanceBuffer = device.createBuffer({
        size: data1.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(instanceBuffer, 0, data1);
    batch.instanceBuffer = instanceBuffer;


    //Indices
    let indices = batch.shape.getIndices();
    const indexBuffer = device.createBuffer({
        size: indices.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(
        indexBuffer,
        0,
        indices
    );
    batch.indexBuffer = indexBuffer;
}


//Prepare uniforms
const uniforms = uniform.createBufferAndLayout(
    device,
    [
        { name: "V", type: "mat4" },
        { name: "P", type: "mat4" },
        { name: "eyePosition", type: "vec3" },
        { name: "Mtex", type: "mat4" },
        { name: "reflective", type: "f32" },
    ]
);
const backgroundUniforms = uniform.createBufferAndLayout(
    device,
    [
        { name: "V", type: "mat4" },
        { name: "P", type: "mat4" },
        { name: "eyePosition", type: "vec3" },
        { name: "Mtex", type: "mat4" },
        { name: "reflective", type: "f32" },
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

const pipeline = await createPipeline([vertexBufferLayout, instanceBufferLayout]);



const cubeMapUrls = [
    "cm_left.png",
    "cm_right.png",
    "cm_top.png",
    "cm_bottom.png",
    "cm_back.png",
    "cm_front.png",
].map((filename) => new URL(`../../utility/images/cubemap/${filename}`, import.meta.url));

const texturesController = new TexturesController({
    device,
    pipeline,
    uniforms,
    cubeMapUrls
});
await texturesController.initialize();
texturesController.registerUniformBuffer(backgroundUniforms.buffer);

const world = {
    min: vec3(-10, -10, -10),
    max: vec3(10, 10, 10)
};

//Render
function render() {
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
        colorAttachments: [{
            view: msaaTexture.createView(),
            resolveTarget: context.getCurrentTexture().createView(),
            loadOp: 'clear',
            storeOp: 'store',
            clearValue: { r: 0, g: 0, b: 0, a: 0.0 },
        }],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthLoadOp: 'clear',
            depthClearValue: 1.0,
            depthStoreOp: 'store',
        },
    });


  
    const backgroundTextureMatrix = mult(inverse(cameraController.V), inverse(cameraController.P));
    uniform.add(device, backgroundUniforms, {
        V: mat4(),
        P: mat4(),
        eyePosition: vec3(0, 0, 0),
        Mtex: backgroundTextureMatrix,
        reflective: 0,
    });

    pass.setPipeline(pipeline);
    pass.setBindGroup(0, texturesController.getBindGroup(backgroundUniforms.buffer));
    pass.setVertexBuffer(0, backgroundVertexBuffer);
    pass.setVertexBuffer(1, backgroundInstanceBuffer);
    pass.setIndexBuffer(backgroundIndexBuffer, "uint32");
    pass.drawIndexed(backgroundShape.getIndices().length);

    uniform.add(device, uniforms, {
        V: cameraController.V,
        P: cameraController.P,
        eyePosition: cameraController.eyePosition,
        Mtex: mat4(),
        reflective: 1,
    });

    pass.setBindGroup(0, texturesController.getBindGroup(uniforms.buffer));
    for (const batch of objectLists) {
        pass.setVertexBuffer(0, batch.vertexBuffer);
        pass.setVertexBuffer(1, batch.instanceBuffer);
        pass.setIndexBuffer(batch.indexBuffer, 'uint32');
        pass.drawIndexed(batch.shape.getIndices().length, batch.objects.length);
    }

    pass.end();
    device.queue.submit([encoder.finish()]);
}

function animate(timestamp = 0) {
    cameraController.update(timestamp);

    for (const batch of objectLists) {
        for (const object of batch.objects) {
            object.step(world);
        }

        device.queue.writeBuffer(
            batch.instanceBuffer,
            0,
            new Float32Array(
                batch.objects.flatMap(object => Array.from(flatten(object.getM())))
            )
        );
    }
    render();
    requestAnimationFrame(animate);
}

async function createPipeline(layouts) {

    let shaderModule = await createShaderModule("wgsl", device);

    const pipeline = device.createRenderPipeline({
        layout: "auto",

        vertex: {
            module: shaderModule,
            entryPoint: "main_vs",
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

animate();
