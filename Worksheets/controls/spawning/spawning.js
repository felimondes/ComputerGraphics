import { RenderObject } from "../../utility/RenderObject.js";
import { OBJShape } from "../../utility/shapes/OBJShape.js";
import { Circle } from "../../utility/shapes/circle.js";
import { Quad } from "../../utility/shapes/quad.js";
import { Sphere } from "../../utility/shapes/sphere.js";
import { Tessellated2D } from "../../utility/shapes/tessellated2D.js";
import { OBBTree } from "../../utility/collision/OBBTree.js";

export class SpawningController {
    constructor(world, onSpawn, {
        dimensions = 2,
        shapeIds = ["sphere", "circle", "suzanne", "teapot", "quad"],
        radiusRange = [50, 50],
        velocityLimit = 2,
        angularVelocityLimit = 0,
        defaultCount = 3,
        initialObjects = [],
        createOBBTree = (positions, indices) => new OBBTree(positions, indices),
    } = {}) {
        this.world = world;
        this.onSpawn = onSpawn;
        this.dimensions = dimensions;
        this.shapeIds = new Set(shapeIds);
        this.radiusRange = radiusRange;
        this.velocityLimit = velocityLimit;
        this.angularVelocityLimit = angularVelocityLimit;
        this.defaultCount = defaultCount;
        this.initialObjects = initialObjects;
        this.createOBBTree = createOBBTree;
        this.controls = document.getElementById("spawning");
        if (!this.controls) {
            throw new Error("Spawning controls are missing from the page.");
        }
        if (typeof onSpawn !== "function") {
            throw new TypeError("SpawningController requires an onSpawn callback.");
        }
        if (dimensions !== 2 && dimensions !== 3) {
            throw new RangeError("SpawningController dimensions must be 2 or 3.");
        }

        this.ready = this.initialize();
    }

    async initialize() {
        const [suzanne, teapot] = await Promise.all([
            OBJShape.fromFile(new URL("../../Project/suzanne.obj", import.meta.url)),
            OBJShape.fromFile(new URL("../../Project/teapot.obj", import.meta.url)),
        ]);
        const availableShapes = [
            { id: "sphere", label: "Sphere", objects: [], shape: new Sphere(4) },
            { id: "circle", label: "Flat circle", objects: [], shape: new Circle() },
            { id: "suzanne", label: "Suzanne", objects: [], shape: suzanne },
            { id: "teapot", label: "Teapot", objects: [], shape: teapot },
            { id: "quad", label: "Quad", objects: [], shape: new Quad() },
            { id: "tessellated-2d", label: "Tessellated 2D", objects: [], shape: new Tessellated2D() },
        ];
        this.objectLists = availableShapes.filter(batch =>
            this.shapeIds.has(batch.id)
        );
        if (this.objectLists.length !== this.shapeIds.size) {
            throw new RangeError("SpawningController was given an unknown shape id.");
        }

        for (const initialObject of this.initialObjects) {
            const batch = this.objectLists.find(
                item => item.id === initialObject.shapeId
            );
            if (!batch) {
                throw new RangeError(
                    `Initial object shape is not available: ${initialObject.shapeId}`
                );
            }
            batch.objects.push(this.createInitialObject(batch.shape, initialObject));
        }

        const shapeSelect = this.controls.querySelector("#spawn-shape");
        this.controls.querySelector("#object-count").value = String(this.defaultCount);
        for (const batch of this.objectLists) {
            const option = document.createElement("option");
            option.value = batch.id;
            option.textContent = batch.label;
            shapeSelect.append(option);
        }

        this.spawnButton = this.controls.querySelector("#spawn-objects");
        this.spawnButton.disabled = true;
        this.spawnButton.addEventListener(
            "click",
            () => this.spawnSelected()
        );
    }

    activate() {
        this.spawnButton.disabled = false;
    }

    spawnSelected() {
        const countInput = this.controls.querySelector("#object-count");
        if (!countInput.checkValidity()) {
            countInput.reportValidity();
            return;
        }

        const batch = this.objectLists.find(
            item => item.id === this.controls.querySelector("#spawn-shape").value
        );
        if (!batch) {
            throw new Error("The selected object shape is not available.");
        }

        const count = Number(countInput.value);
        for (let index = 0; index < count; index++) {
            batch.objects.push(this.createMovingObject(batch.shape));
        }
        this.onSpawn(batch);
    }

    createMovingObject(shape) {
        const targetRadius = randomInRange(...this.radiusRange);
        const volume = shape.getBoundingVolume();
        if (
            !volume ||
            !Number.isFinite(volume.radius) ||
            volume.radius <= 0
        ) {
            throw new RangeError("Spawned shapes must have a positive finite bounding radius.");
        }
        const scale = targetRadius / volume.radius;
        const targetCenter = randomPositionInWorld(
            this.world,
            targetRadius,
            this.dimensions
        );
        const rotation = this.dimensions === 3
            ? vec3(
                randomInRange(0, 360),
                randomInRange(0, 360),
                randomInRange(0, 360)
            )
            : vec3(0, 0, randomInRange(0, 360));
        const orientation = mult(
            rotateZ(rotation[2]),
            mult(rotateY(rotation[1]), rotateX(rotation[0]))
        );
        const localCenter = mult(
            orientation,
            vec4(
                volume.center[0] * scale,
                volume.center[1] * scale,
                volume.center[2] * scale,
                1
            )
        );
        const center = subtract(targetCenter, vec3(
            localCenter[0],
            localCenter[1],
            localCenter[2]
        ));
        const object = new RenderObject(shape, center);
        object.scalingFactor = vec3(scale, scale, scale);
        object.rotation = rotation;
        object.velocity = vec3(
            randomInRange(-this.velocityLimit, this.velocityLimit),
            randomInRange(-this.velocityLimit, this.velocityLimit),
            this.dimensions === 3
                ? randomInRange(-this.velocityLimit, this.velocityLimit)
                : 0
        );
        object.angularVelocity = this.dimensions === 3
            ? vec3(
                randomInRange(-this.angularVelocityLimit, this.angularVelocityLimit),
                randomInRange(-this.angularVelocityLimit, this.angularVelocityLimit),
                randomInRange(-this.angularVelocityLimit, this.angularVelocityLimit)
            )
            : vec3(0, 0, randomInRange(
                -this.angularVelocityLimit,
                this.angularVelocityLimit
            ));
        
        try {
            const positions = shape.getPositions();
            const indices = shape.getIndices();
            if (positions && indices) {
                object.obbTree = this.createOBBTree(positions, indices);
            }
        } catch (e) {
            console.warn("Could not build OBBTree for spawned object:", e.message);
        }
        
        return object;
    }

    createInitialObject(shape, {
        center = [0, 0, 0],
        velocity = [0, 0, 0],
        rotation = [0, 0, 0],
        angularVelocity = [0, 0, 0],
        scalingFactor = [1, 1, 1],
    }) {
        const object = new RenderObject(shape, vec3(...center));
        object.velocity = vec3(...velocity);
        object.rotation = vec3(...rotation);
        object.angularVelocity = vec3(...angularVelocity);
        object.scalingFactor = vec3(...scalingFactor);
        
        try {
            const positions = shape.getPositions();
            const indices = shape.getIndices();
            if (positions && indices) {
                object.obbTree = this.createOBBTree(positions, indices);
            }
        } catch (e) {
            console.warn("Could not build OBBTree for initial object:", e.message);
        }
        
        return object;
    }
}

function randomPositionInWorld(bounds, margin, dimensions) {
    const position = [0, 0, 0];
    for (let axis = 0; axis < dimensions; axis++) {
        const min = bounds.min[axis] + margin;
        const max = bounds.max[axis] - margin;
        if (min > max) {
            throw new RangeError("Object does not fit inside the world bounds.");
        }
        position[axis] = randomInRange(min, max);
    }
    return vec3(...position);
}

function randomInRange(min, max) {
    return min + Math.random() * (max - min);
}
