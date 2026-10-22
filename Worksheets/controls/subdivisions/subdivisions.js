import { createIndexBuffer } from "../../W5/p3/mostlyClutter/index.js";
import { RenderObject } from "../../utility/RenderObject.js";

const MIN_SUBDIVISION = 0;
const MAX_SUBDIVISION = 6;

export class SubdivisionController {
    constructor(objectLists, device) {
        this.objectLists = objectLists;
        this.device = device;
        this.vertexBufferFactory = this.vertexBufferFactory;
        this.level = MIN_SUBDIVISION;

        this.decreaseButton = document.getElementById("decrease-subdivision");
        this.increaseButton = document.getElementById("increase-subdivision");
        this.levelLabel = document.getElementById("subdivision-level");

        if (!this.decreaseButton || !this.increaseButton || !this.levelLabel) {
            throw new Error("Subdivision controls are missing from the page.");
        }

        this.decreaseButton.addEventListener("click", () => {
            this.setLevel(this.level - 1);
        });
        this.increaseButton.addEventListener("click", () => {
            this.setLevel(this.level + 1);
        });

        this.updateLabel();
    }

    vertexBufferFactory(device, positions, normals) {
        if (positions.length % 4 !== 0 || normals.length !== positions.length) {
            throw new Error("Vertex positions and normals must contain matching vec4 data.");
        }

        const data = new Float32Array(positions.length + normals.length);
        for (let vertex = 0; vertex < positions.length / 4; vertex++) {
            const vertexOffset = vertex * 8;
            const attributeOffset = vertex * 4;
            data.set(positions.subarray(attributeOffset, attributeOffset + 4), vertexOffset);
            data.set(normals.subarray(attributeOffset, attributeOffset + 4), vertexOffset + 4);
        }

        const vertexBuffer = device.createBuffer({
            size: Math.max(data.byteLength, 4),
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(vertexBuffer, 0, data);

        return vertexBuffer;
    }

    clampLevel(level) {
        return Math.max(MIN_SUBDIVISION, Math.min(MAX_SUBDIVISION, level));
    }

    setLevel(level) {
        const nextLevel = this.clampLevel(level);
        if (nextLevel === this.level) {
            return;
        }
        this.level = nextLevel;
        this.updateLabel();
        this.onChange();
    }

    onChange() {
        for (const batch of this.objectLists) {
            if (!batch.shape.isSubdivisble()) {
                continue;
            }


            const shape = batch.shape.subdivide(this.level);
            const updatedObjects = batch.objects.map((object) => {
                const replacement = new RenderObject(shape, object.center);
                replacement.velocity = object.velocity;
                replacement.acceleration = object.acceleration;
                replacement.rotation = object.rotation;
                replacement.angularVelocity = object.angularVelocity;
                replacement.timeStep = object.timeStep;
                return replacement;
            });

            batch.objects.splice(0, batch.objects.length, ...updatedObjects);
            batch.shape = shape;

            batch.vertexBuffer.destroy();
            batch.indexBuffer.destroy();
            batch.vertexBuffer = this.vertexBufferFactory(
                this.device,
                shape.getPositions(),
                shape.getNormals(),
            );
            batch.indexBuffer = createIndexBuffer(this.device, shape.getIndices());
        }

    }

    updateLabel() {
        this.levelLabel.textContent = `Subdivision level: ${this.level}`;
    }
}