import * as uniform from "../../utility/uniform.js";

export class BoundsController {
    constructor(device, canvasFormat, {
        dimensions = 3,
        sampleCount = 1,
        onChange = () => {},
    } = {}) {
        if (dimensions !== 2 && dimensions !== 3) {
            throw new RangeError("BoundsController dimensions must be 2 or 3.");
        }
        if (typeof onChange !== "function") {
            throw new TypeError("BoundsController onChange must be a function.");
        }

        this.device = device;
        this.dimensions = dimensions;
        this.batches = new Map();
        this.triangleBatches = new Map();
        this.controls = document.getElementById("bounds");
        if (!this.controls) {
            throw new Error("Misc controls are missing from the page.");
        }

        this.boundingVolumeToggle = this.controls.querySelector("#show-bounding-volumes");
        this.meshTrianglesToggle = this.controls.querySelector("#show-mesh-triangles");
        this.obbTreeToggle = this.controls.querySelector("#show-obb-trees");
        this.obbDepthInput = this.controls.querySelector("#obb-tree-level");
        if (!this.boundingVolumeToggle || !this.meshTrianglesToggle) {
            throw new Error("Misc controls are incomplete.");
        }
        this.boundingVolumeToggle.addEventListener("change", onChange);
        this.meshTrianglesToggle.addEventListener("change", onChange);
        if (this.obbTreeToggle) {
            this.obbTreeToggle.addEventListener("change", onChange);
        }
        if (this.obbDepthInput) {
            this.obbDepthInput.addEventListener("change", onChange);
            this.obbDepthInput.addEventListener("input", onChange);
        }

        this.uniforms = uniform.createBufferAndLayout(device, [
            { name: "V", type: "mat4" },
            { name: "P", type: "mat4" },
        ]);
        this.boundingVolumePipeline = this.createPipeline(
            canvasFormat,
            sampleCount,
            "vec4f(1.0, 0.2, 0.1, 1.0)"
        );
        this.boundingVolumeBindGroup = this.createBindGroup(
            this.boundingVolumePipeline
        );
        const sphereVertices = createSphereLines(dimensions);
        this.sphereVertexBuffer = this.createVertexBuffer(sphereVertices);
        this.sphereVertexCount = sphereVertices.length / 3;
        this.meshTrianglePipeline = this.createPipeline(
            canvasFormat,
            sampleCount,
            "vec4f(0.05, 0.05, 0.05, 1.0)"
        );
        this.meshTriangleBindGroup = this.createBindGroup(
            this.meshTrianglePipeline
        );
        this.obbTreePipeline = this.createPipeline(
            canvasFormat,
            sampleCount,
            "vec4f(0.2, 0.8, 0.2, 1.0)"
        );
        this.obbTreeBindGroup = this.createBindGroup(this.obbTreePipeline);
        this.obbBatches = new Map();
    }

    createPipeline(canvasFormat, sampleCount, color) {
        const module = this.device.createShaderModule({
            label: "Misc visualization shader",
            code: `
                struct Uniforms {
                    V: mat4x4f,
                    P: mat4x4f,
                };

                @group(0) @binding(0)
                var<uniform> uniforms: Uniforms;

                struct VertexInput {
                    @location(0) position: vec3f,
                    @location(1) model0: vec4f,
                    @location(2) model1: vec4f,
                    @location(3) model2: vec4f,
                    @location(4) model3: vec4f,
                };

                @vertex
                fn main_vs(input: VertexInput) -> @builtin(position) vec4f {
                    let model = mat4x4f(
                        input.model0,
                        input.model1,
                        input.model2,
                        input.model3
                    );
                    return uniforms.P * uniforms.V * model * vec4f(input.position, 1.0);
                }

                @fragment
                fn main_fs() -> @location(0) vec4f {
                    return ${color};
                }
            `,
        });

        return this.device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module,
                entryPoint: "main_vs",
                buffers: [
                    {
                        arrayStride: 12,
                        attributes: [{
                            format: "float32x3",
                            offset: 0,
                            shaderLocation: 0,
                        }],
                    },
                    {
                        arrayStride: 64,
                        stepMode: "instance",
                        attributes: [
                            { format: "float32x4", offset: 0, shaderLocation: 1 },
                            { format: "float32x4", offset: 16, shaderLocation: 2 },
                            { format: "float32x4", offset: 32, shaderLocation: 3 },
                            { format: "float32x4", offset: 48, shaderLocation: 4 },
                        ],
                    },
                ],
            },
            fragment: {
                module,
                entryPoint: "main_fs",
                targets: [{ format: canvasFormat }],
            },
            primitive: { topology: "line-list" },
            depthStencil: {
                format: "depth24plus",
                depthWriteEnabled: false,
                depthCompare: "less-equal",
            },
            multisample: { count: sampleCount },
        });
    }

    createBindGroup(pipeline) {
        return this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [{
                binding: 0,
                resource: { buffer: this.uniforms.buffer },
            }],
        });
    }

    createVertexBuffer(vertices) {
        const buffer = this.device.createBuffer({
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(buffer, 0, vertices);
        return buffer;
    }

    draw(pass, batches, V, P) {
        if (!this.boundingVolumeToggle.checked && !this.meshTrianglesToggle.checked && !this.obbTreeToggle?.checked) {
            return;
        }

        uniform.add(this.device, this.uniforms, { V, P });
        if (this.boundingVolumeToggle.checked) {
            pass.setPipeline(this.boundingVolumePipeline);
            pass.setBindGroup(0, this.boundingVolumeBindGroup);
            this.drawBatches(pass, batches);
        }
        if (this.meshTrianglesToggle.checked) {
            pass.setPipeline(this.meshTrianglePipeline);
            pass.setBindGroup(0, this.meshTriangleBindGroup);
            this.drawTriangleBatches(pass, batches);
        }
        if (this.obbTreeToggle?.checked) {
            pass.setPipeline(this.obbTreePipeline);
            pass.setBindGroup(0, this.obbTreeBindGroup);
            this.drawOBBTrees(pass, batches);
        }
    }

    drawBatches(pass, batches) {
        for (const batch of batches) {
            if (batch.objects.length === 0) {
                continue;
            }

            const resources = this.getBatchResources(batch);
            const instanceBuffer = this.writeInstanceMatrices(resources, batch);
            pass.setVertexBuffer(0, this.sphereVertexBuffer);
            pass.setVertexBuffer(1, instanceBuffer);
            pass.draw(this.sphereVertexCount, batch.objects.length);
        }
    }

    drawTriangleBatches(pass, batches) {
        for (const batch of batches) {
            if (batch.objects.length === 0) {
                continue;
            }

            const resources = this.getTriangleBatchResources(batch);
            const instanceBuffer = this.writeTriangleInstanceMatrices(
                resources,
                batch
            );
            pass.setVertexBuffer(0, resources.vertexBuffer);
            pass.setVertexBuffer(1, instanceBuffer);
            pass.draw(resources.vertexCount, batch.objects.length);
        }
    }

    getTriangleBatchResources(batch) {
        let resources = this.triangleBatches.get(batch);
        if (resources) {
            return resources;
        }

        const triangleVertices = createTriangleLines(
            batch.shape.getPositions(),
            batch.shape.getIndices()
        );
        const capacity = Math.max(1, batch.objects.length);
        resources = {
            instanceCapacity: capacity,
            instanceBuffer: this.createInstanceBuffer(capacity),
            vertexBuffer: this.createVertexBuffer(triangleVertices),
            vertexCount: triangleVertices.length / 3,
        };
        this.triangleBatches.set(batch, resources);
        return resources;
    }

    writeTriangleInstanceMatrices(resources, batch) {
        let buffer = resources.instanceBuffer;
        if (batch.objects.length > resources.instanceCapacity) {
            const oldBuffer = buffer;
            resources.instanceCapacity = Math.max(
                resources.instanceCapacity * 2,
                batch.objects.length
            );
            buffer = this.createInstanceBuffer(resources.instanceCapacity);
            resources.instanceBuffer = buffer;
            this.device.queue.onSubmittedWorkDone().then(() => oldBuffer.destroy());
        }

        const matrices = batch.objects.map(object => object.getM());
        this.device.queue.writeBuffer(
            buffer,
            0,
            new Float32Array(
                matrices.flatMap(matrix => Array.from(flatten(matrix)))
            )
        );
        return buffer;
    }

    getBatchResources(batch) {
        let resources = this.batches.get(batch);
        if (resources) {
            return resources;
        }

        const capacity = Math.max(1, batch.objects.length);
        resources = {
            instanceCapacity: capacity,
            instanceBuffer: this.createInstanceBuffer(capacity),
        };
        this.batches.set(batch, resources);
        return resources;
    }

    createInstanceBuffer(capacity) {
        return this.device.createBuffer({
            size: capacity * 64,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
    }

    writeInstanceMatrices(resources, batch) {
        let buffer = resources.instanceBuffer;
        if (batch.objects.length > resources.instanceCapacity) {
            const oldBuffer = buffer;
            resources.instanceCapacity = Math.max(
                resources.instanceCapacity * 2,
                batch.objects.length
            );
            buffer = this.createInstanceBuffer(resources.instanceCapacity);
            resources.instanceBuffer = buffer;
            this.device.queue.onSubmittedWorkDone().then(() => oldBuffer.destroy());
        }

        const matrices = batch.objects.map(object => {
            const volume = object.getBoundingVolume();
            if (volume.type !== "sphere") {
                throw new TypeError("Bounds visualization only supports spherical volumes.");
            }
            return mult(
                translate(volume.center),
                scalem(volume.radius, volume.radius, volume.radius)
            );
        });
        this.device.queue.writeBuffer(
            buffer,
            0,
            new Float32Array(
                matrices.flatMap(matrix => Array.from(flatten(matrix)))
            )
        );
        return buffer;
    }

    drawOBBTrees(pass, batches) {
        const targetDepth = this.obbDepthInput ? 
            parseInt(this.obbDepthInput.value, 10) : 0;
        const resources = this.getOBBBatchResources();
        
        const allMatrices = [];
        for (const batch of batches) {
            if (batch.objects.length === 0) {
                continue;
            }

            for (const object of batch.objects) {
                if (!object.obbTree) {
                    continue;
                }

                const nodes = object.obbTree.getNodesAtDepth(targetDepth);
                const objectMatrices = this.getOBBMatrices(object, nodes);
                allMatrices.push(...objectMatrices);
            }
        }

        if (allMatrices.length === 0) {
            return;
        }

        const instanceBuffer = this.createInstanceBuffer(Math.max(allMatrices.length, 1));
        this.device.queue.writeBuffer(
            instanceBuffer,
            0,
            new Float32Array(
                allMatrices.flatMap(matrix => Array.from(flatten(matrix)))
            )
        );

        pass.setVertexBuffer(0, resources.vertexBuffer);
        pass.setVertexBuffer(1, instanceBuffer);
        pass.draw(resources.vertexCount, allMatrices.length);
    }

    getOBBBatchResources() {
        if (this._obbResources) {
            return this._obbResources;
        }

        const boxVertices = createBoxLines();
        const resources = {
            vertexBuffer: this.createVertexBuffer(boxVertices),
            vertexCount: boxVertices.length / 3,
        };
        this._obbResources = resources;
        return resources;
    }

    getOBBMatrices(object, nodes) {
        const objectM = object.getM();
        return nodes.map(node => {
            const obb = node.obb;
            
            const axes = obb.axes;
            const extents = obb.extents;
            const center = obb.center;
            
            const rotationMatrix = mat4(
                vec4(axes[0][0], axes[1][0], axes[2][0], 0),
                vec4(axes[0][1], axes[1][1], axes[2][1], 0),
                vec4(axes[0][2], axes[1][2], axes[2][2], 0),
                vec4(0, 0, 0, 1)
            );

            const scaleMatrix = scalem(extents[0], extents[1], extents[2]);
            const translateMatrix = translate(center);

            return mult(objectM, mult(translateMatrix, mult(rotationMatrix, scaleMatrix)));
        });
    }

    writeOBBMatrices(resources, object, nodes) {
        let buffer = resources.instanceBuffer;
        if (nodes.length > resources.instanceCapacity) {
            const oldBuffer = buffer;
            resources.instanceCapacity = Math.max(
                resources.instanceCapacity * 2,
                nodes.length
            );
            buffer = this.createInstanceBuffer(resources.instanceCapacity);
            resources.instanceBuffer = buffer;
            this.device.queue.onSubmittedWorkDone().then(() => oldBuffer.destroy());
        }

        const matrices = this.getOBBMatrices(object, nodes);

        this.device.queue.writeBuffer(
            buffer,
            0,
            new Float32Array(
                matrices.flatMap(matrix => Array.from(flatten(matrix)))
            )
        );
        return buffer;
    }
}

function createSphereLines(dimensions, segments = 48) {
    const vertices = [];
    const planes = dimensions === 2
        ? [[0, 1]]
        : [[0, 1], [0, 2], [1, 2]];
    for (const [firstAxis, secondAxis] of planes) {
        for (let segment = 0; segment < segments; segment++) {
            const angleA = (2 * Math.PI * segment) / segments;
            const angleB = (2 * Math.PI * (segment + 1)) / segments;
            const first = [0, 0, 0];
            const second = [0, 0, 0];
            first[firstAxis] = Math.cos(angleA);
            first[secondAxis] = Math.sin(angleA);
            second[firstAxis] = Math.cos(angleB);
            second[secondAxis] = Math.sin(angleB);
            vertices.push(...first, ...second);
        }
    }
    return new Float32Array(vertices);
}

function createTriangleLines(positions, indices) {
    if (positions.length % 4 !== 0 || indices.length % 3 !== 0) {
        throw new Error("Mesh positions and indices must describe vec4 triangles.");
    }

    const vertices = [];
    for (let index = 0; index < indices.length; index += 3) {
        const triangle = [
            indices[index],
            indices[index + 1],
            indices[index + 2],
        ];
        for (let edge = 0; edge < 3; edge++) {
            const first = triangle[edge];
            const second = triangle[(edge + 1) % 3];
            if (
                first >= positions.length / 4 ||
                second >= positions.length / 4
            ) {
                throw new RangeError("Mesh triangle index is outside the vertex data.");
            }
            vertices.push(
                positions[first * 4],
                positions[first * 4 + 1],
                positions[first * 4 + 2],
                positions[second * 4],
                positions[second * 4 + 1],
                positions[second * 4 + 2]
            );
        }
    }
    return new Float32Array(vertices);
}

function createBoxLines() {
    const corners = [
        [-1, -1, -1], [1, -1, -1],
        [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1], [1, -1, 1],
        [1, 1, 1], [-1, 1, 1],
    ];

    const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7],
    ];

    const vertices = [];
    for (const [start, end] of edges) {
        vertices.push(...corners[start], ...corners[end]);
    }

    return new Float32Array(vertices);
}
