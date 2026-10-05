import { createIndexBuffer, createVertexBuffer } from "../../mostlyClutter/index.js";
import { RenderObject } from "../../utility/RenderObject.js";
import { Sphere } from "../../utility/shapes/sphere.js";

const MIN_SUBDIVISION = 0;
const MAX_SUBDIVISION = 6;

export class SubdivisionController {
    constructor(objectLists, device) {
        this.objectLists = objectLists;
        this.device = device;
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

            const shape = new Sphere(this.level);
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
            batch.vertexBuffer = createVertexBuffer(
                this.device,
                shape.positions,
                shape.normals
            );
            batch.indexBuffer = createIndexBuffer(this.device, shape.indices);
        }

    }

    updateLabel() {
        this.levelLabel.textContent = `Subdivision level: ${this.level}`;
    }
}