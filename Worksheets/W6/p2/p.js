//TODO: "textureSampleLevel(myTexture, mySampler, texCoords, d)" - slide WebGPU textures, im not using this
//TODO: How does mini and mag filters work? texture dont fit object, but what happens?
//TODO: 


import * as uniform from "../../utility/uniform.js";
ort { generateMipmap, numMipLevels } from "./genmipmap.js";imp
import {
    configureCanvas,
    createDevice,
} from "./mostlyClutter/index.js";

//Connect to GPU
const device = await createDevice();
let { canvas, context, canvasFormat } = configureCanvas(device);


//Positions + UVS
var positions = [vec4(-4, -1, -1, 1), vec4(4, -1, -1, 1), vec4(4, -1, -21, 1), vec4(-4, -1, -21, 1)];
var posStride = 16;

var UV = [vec2(-1.5, 0.0), vec2(2.5, 0.0), vec2(2.5, 10.0), vec2(-1.5, 10.0)]
var uvStride = 8;

const data = new Float32Array(
    positions.flatMap((position, i) => [
        ...position,
        ...UV[i]
    ])
);

const vertexBufferLayout = {
    arrayStride: posStride + uvStride,
    attributes: [
        //positions
        {
            format: "float32x4",
            offset: 0,
            shaderLocation: 0,
        },

        //UVs
        {
            format: "float32x2",
            offset: posStride,
            shaderLocation: 1,
        },

    ]
};

const vertexBuffer = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(vertexBuffer, 0, data);

//Indices
var indices = new Uint32Array([0, 1, 2, 0, 2, 3]);
const indexBuffer = device.createBuffer({
    size: indices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(indexBuffer, 0, indices);




//Uniforms
let P = perspective(90, canvas.width / canvas.height, 0.01, 100);
const uniforms = uniform.createBufferAndLayout(
    device,
    [
        { name: "P", type: "mat4" },
    ]
);

//Texture
const texSize = 64;
const numRows = 8;
const numCols = 8;
const myTexels = new Uint8Array(4 * texSize * texSize);
for (let i = 0; i < texSize; ++i) {
    for (let j = 0; j < texSize; ++j) {
        const patchx = Math.floor(i / (texSize / numRows));
        const patchy = Math.floor(j / (texSize / numCols));
        const c = (patchx % 2 !== patchy % 2 ? 255 : 0);
        const idx = 4 * (i * texSize + j);
        myTexels[idx] = myTexels[idx + 1] = myTexels[idx + 2] = c;
        myTexels[idx + 3] = 255;
    }
}

const wrapModeControl = document.getElementById("wrap-mode");
const minFilterControl = document.getElementById("min-filter");
const magFilterControl = document.getElementById("mag-filter");
const mipmapFilterControl = document.getElementById("mipmap-filter");
const mipmapEnabledControl = document.getElementById("mipmap-enabled")

let texture;
let bindGroup;

function updateTextureSettings() {

    
    //mipmap
    const myTexture = device.createTexture({
        size: [texSize, texSize, 1],
        format: "rgba8unorm",
        mipLevelCount: mipmapEnabledControl.checked ?numMipLevels(texSize, texSize):1,
        usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
    });
    
    device.queue.writeTexture(
        { texture: myTexture }, myTexels,
        { offset: 0, bytesPerRow: texSize * 4, rowsPerImage: texSize },
        [texSize, texSize, 1]);

    if (mipmapEnabledControl.checked) { 
        generateMipmap(device, myTexture); //what happens in here stays in here ... X)
    }

    const sampler = device.createSampler({
        addressModeU: wrapModeControl.value,
        addressModeV: wrapModeControl.value,
        minFilter: minFilterControl.value,
        magFilter: magFilterControl.value,
        mipmapFilter: mipmapFilterControl.value,
    });


    bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: uniforms.buffer },
            { binding: 1, resource: sampler },
            { binding: 2, resource: myTexture.createView() },
        ],
    });

    render();
    texture?.destroy();
    texture = myTexture;
}

//Pipeline
const shaderElement = document.getElementById("wgsl");
const shaderCode = await fetch(shaderElement.src).then(response => response.text());
const shaderModule = device.createShaderModule({
    label: "wgsl",
    code: shaderCode
});

const pipeline = device.createRenderPipeline({
    layout: 'auto',

    vertex: {
        module: shaderModule,
        entryPoint: 'main_vs',
        buffers: [vertexBufferLayout]
    },

    fragment: {
        module: shaderModule,
        entryPoint: 'main_fs',
        targets: [{ format: canvasFormat }],
    }
});

uniform.add(device, uniforms, {
    P: P,
});



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

    pass.setBindGroup(0, bindGroup);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setIndexBuffer(indexBuffer, 'uint32');
    pass.drawIndexed(indices.length, 1);

    pass.end();
    device.queue.submit([encoder.finish()]);
}

document.getElementById("texture-controls").addEventListener("change", updateTextureSettings);
updateTextureSettings();

