import { loadSliderDefaults } from "../settings.js";

const DEFAULT_CAMERA_VALUES = {
    eyeX: 0,
    eyeY: 0,
    eyeZ: 10,
    mouseSensitivity: 0.005,
};
const CAMERA_MOVEMENT_SPEED = 5;

const MOVEMENT_KEYS = {
    KeyW: "forward",
    KeyS: "backward",
    KeyA: "left",
    KeyD: "right",
    Space: "up",
    ShiftLeft: "down",
};

export class CameraController {
    constructor(
        canvas, 
        settingsUrl = null, 
        default_at = vec3(0,0,0), 
        options = { pointerLock: true, keyboard: true }) {
        this.values = {};
        const controls = document.getElementById("camera");
        if (!controls) {
            throw new Error("Camera controls are missing from the page.");
        }
        this.controls = controls;
        if (!canvas) {
            throw new Error("Camera requires a canvas to configure projection.");
        }

        this.canvas = canvas;
        this.up = vec3(0, 1, 0);
        this.at = default_at
        this.pointerLockEnabled = options.pointerLock ?? false;
        this.keyboardEnabled = options.keyboard ?? false;
        this.pointerLocked = false;
        this.movementKeys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            up: false,
            down: false,
        };
        this.orbiting = false;
        this.wasOrbiting = false;
        this.cameraAngle = 0;
        this.previousFrameTime = 0;
        this.azimuth = 0;
        this.polar = Math.PI / 2;
        this.viewDistance = 1;
        this.hasUserOrientation = false;

        this.ready = this.initialize(settingsUrl);
    }

    async initialize(settingsUrl) {
        const defaultValues = await loadSliderDefaults(
            settingsUrl,
            DEFAULT_CAMERA_VALUES,
            "camera"
        );
        const outputs = new Map(
            Array.from(this.controls.querySelectorAll("[data-slider-output]"))
                .map((output) => [output.dataset.sliderOutput, output])
        );

        for (const input of this.controls.querySelectorAll("[data-slider-key]")) {
            const key = input.dataset.sliderKey;
            const output = outputs.get(key);
            if (!Object.hasOwn(defaultValues, key)) {
                throw new Error(`Unknown camera control: ${key}`);
            }
            const value = defaultValues[key];
            if (
                (input.min !== "" && input.min !== undefined && value < Number(input.min)) ||
                (input.max !== "" && input.max !== undefined && value > Number(input.max))
            ) {
                throw new Error(`Camera setting "${key}" is outside its slider range.`);
            }

            if (!key || !Number.isFinite(value)) {
                throw new Error("Camera sliders require a key and numeric value.");
            }

            input.value = String(value);
            this.values[key] = value;
            this.updateOutput(output, value, input.step);

            input.addEventListener("input", () => {
                const nextValue = Number(input.value);
                if (!Number.isFinite(nextValue)) {
                    return;
                }

                this.values[key] = nextValue;
                this.updateOutput(output, nextValue, input.step);

                if (key === "eyeX" || key === "eyeY" || key === "eyeZ") {
                    const eyePosition = vec3(
                        this.values.eyeX,
                        this.values.eyeY,
                        this.values.eyeZ
                    );
                    this.eyePosition = eyePosition;
                    this.viewDistance = this.distanceToTarget(eyePosition);
                    if (!this.hasUserOrientation || this.viewDistance <= Number.EPSILON) {
                        this.setDirectionFromTarget(eyePosition);
                    }
                }
            });
        }

        if (Object.keys(this.values).length !== Object.keys(DEFAULT_CAMERA_VALUES).length) {
            throw new Error("Camera controls are missing one or more required sliders.");
        }

        this.eyePosition = vec3(
            this.values.eyeX,
            this.values.eyeY,
            this.values.eyeZ
        );
        this.viewDistance = this.distanceToTarget(this.eyePosition);
        this.setDirectionFromTarget(this.eyePosition);
        this.V = lookAt(
            this.eyePosition,
            this.getLookAtPoint(this.eyePosition),
            this.up
        );
        this.P = perspective(45, this.canvas.width / this.canvas.height, 0.01, 100);

        if (this.pointerLockEnabled) {
            this.canvas.addEventListener("click", () => {
                if (document.pointerLockElement === this.canvas) {
                    document.exitPointerLock();
                    return;
                }

                try {
                    const lockRequest = this.canvas.requestPointerLock();
                    lockRequest?.catch(() => {});
                } catch {
                    // Pointer lock can be unavailable immediately after it is released.
                }
            });

            document.addEventListener("pointerlockchange", () => {
                this.pointerLocked = document.pointerLockElement === this.canvas;
            });
        }

        if (this.keyboardEnabled) {
            window.addEventListener("keydown", (event) => {
                const key = MOVEMENT_KEYS[event.code];
                if (!key) {
                    return;
                }

                this.movementKeys[key] = true;
                if (event.code === "Space") {
                    event.preventDefault();
                }
            });

            window.addEventListener("keyup", (event) => {
                const key = MOVEMENT_KEYS[event.code];
                if (key) {
                    this.movementKeys[key] = false;
                }
            });

            window.addEventListener("blur", () => {
                for (const key of Object.keys(this.movementKeys)) {
                    this.movementKeys[key] = false;
                }
            });
        }

        this.canvas.addEventListener("mousemove", (event) => {
            const canControlCamera = this.pointerLockEnabled
                ? this.pointerLocked
                : (event.buttons & 1) !== 0;
            if (!canControlCamera) {
                return;
            }

            this.azimuth += event.movementX * this.values.mouseSensitivity;
            this.polar += event.movementY * this.values.mouseSensitivity;
            this.polar = Math.max(0.01, Math.min(Math.PI - 0.01, this.polar));
            this.hasUserOrientation = true;
        });

        this.button = document.getElementById("toggle-orbit");
        if (!this.button) {
            throw new Error("Camera orbit control is missing from the page.");
        }

        this.button.addEventListener("click", () => {
            this.orbiting = !this.orbiting;
            if (this.orbiting) {
                this.cameraAngle = 0;
                this.previousFrameTime = 0;
                if (!this.hasUserOrientation) {
                    this.setDirectionFromTarget(this.eyePosition);
                }
            }

            this.button.textContent = this.orbiting
                ? "Stop orbit"
                : "Start orbit";
        });
    }

    updateOutput(output, value, step) {
        if (!output) {
            return;
        }

        const precision = step.includes(".") ? step.split(".")[1].length : 0;
        output.value = value.toFixed(precision);
    }

    distanceToTarget(eyePosition) {
        return Math.hypot(
            this.at[0] - eyePosition[0],
            this.at[1] - eyePosition[1],
            this.at[2] - eyePosition[2]
        );
    }

    setDirectionFromTarget(eyePosition) {
        const x = this.at[0] - eyePosition[0];
        const y = this.at[1] - eyePosition[1];
        const z = this.at[2] - eyePosition[2];
        if (this.viewDistance <= Number.EPSILON) {
            this.viewDistance = 1;
            this.azimuth = 0;
            this.polar = Math.PI / 2;
            return;
        }

        this.azimuth = Math.atan2(z, x);
        this.polar = Math.max(
            0.01,
            Math.min(
                Math.PI - 0.01,
                Math.acos(Math.max(-1, Math.min(1, y / this.viewDistance)))
            )
        );
    }

    getLookAtPoint(eyePosition) {
        return vec3(
            eyePosition[0] +
                this.viewDistance * Math.sin(this.polar) * Math.cos(this.azimuth),
            eyePosition[1] + this.viewDistance * Math.cos(this.polar),
            eyePosition[2] +
                this.viewDistance * Math.sin(this.polar) * Math.sin(this.azimuth)
        );
    }

    update(timestamp) {
        const deltaTime =
            this.previousFrameTime === 0
                ? 0
                : (timestamp - this.previousFrameTime) / 1000;

        this.previousFrameTime = timestamp;

        let nextEyePosition;
        if (this.orbiting) {
            this.cameraAngle += deltaTime;

            const cosAngle = Math.cos(this.cameraAngle);
            const sinAngle = Math.sin(this.cameraAngle);
            const offsetX = this.values.eyeX - this.at[0];
            const offsetY = this.values.eyeY - this.at[1];
            const offsetZ = this.values.eyeZ - this.at[2];
            nextEyePosition = vec3(
                this.at[0] + offsetX * cosAngle + offsetZ * sinAngle,
                this.at[1] + offsetY,
                this.at[2] - offsetX * sinAngle + offsetZ * cosAngle
            );
        } else {
            if (this.wasOrbiting) {
                ["eyeX", "eyeY", "eyeZ"].forEach((key, index) => {
                    const input = this.controls.querySelector(`[data-slider-key="${key}"]`);
                    input.value = this.eyePosition[index];
                    input.dispatchEvent(new Event("input", { bubbles: true }));
                });
            }

            nextEyePosition = vec3(
                this.values.eyeX,
                this.values.eyeY,
                this.values.eyeZ
            );
        }

        if (this.orbiting && !this.hasUserOrientation) {
            this.viewDistance = this.distanceToTarget(nextEyePosition);
            this.setDirectionFromTarget(nextEyePosition);
        }

        if (this.keyboardEnabled && !this.orbiting && deltaTime > 0) {
            const viewDirection = vec3(
                Math.sin(this.polar) * Math.cos(this.azimuth),
                Math.cos(this.polar),
                Math.sin(this.polar) * Math.sin(this.azimuth)
            );
            const rightDirection = normalize(cross(viewDirection, this.up));
            const forwardAmount =
                Number(this.movementKeys.forward) - Number(this.movementKeys.backward);
            const sidewaysAmount =
                Number(this.movementKeys.right) - Number(this.movementKeys.left);
            const verticalAmount =
                Number(this.movementKeys.up) - Number(this.movementKeys.down);
            const distance = CAMERA_MOVEMENT_SPEED * deltaTime;

            nextEyePosition = vec3(
                nextEyePosition[0] +
                    distance * (forwardAmount * viewDirection[0] +
                        sidewaysAmount * rightDirection[0]),
                nextEyePosition[1] +
                    distance * (forwardAmount * viewDirection[1] + verticalAmount),
                nextEyePosition[2] +
                    distance * (forwardAmount * viewDirection[2] +
                        sidewaysAmount * rightDirection[2])
            );
            this.eyePosition = nextEyePosition;
            this.values.eyeX = nextEyePosition[0];
            this.values.eyeY = nextEyePosition[1];
            this.values.eyeZ = nextEyePosition[2];

            for (const [index, key] of ["eyeX", "eyeY", "eyeZ"].entries()) {
                const input = this.controls.querySelector(`[data-slider-key="${key}"]`);
                input.value = String(nextEyePosition[index]);
                this.updateOutput(
                    this.controls.querySelector(`[data-slider-output="${key}"]`),
                    nextEyePosition[index],
                    input.step
                );
            }
        }

        try {
            const nextViewMatrix = lookAt(
                nextEyePosition,
                this.getLookAtPoint(nextEyePosition),
                this.up
            );
            if (!nextViewMatrix.flat().every(Number.isFinite)) {
                throw new Error("lookAt produced an invalid view matrix.");
            }

            this.eyePosition = nextEyePosition;
            this.V = nextViewMatrix;
        } catch (error) {
            console.error("lookAt failed; keeping the previous camera view:", error);
        }

        this.P = perspective(45, this.canvas.width / this.canvas.height, 0.01, 100);
        this.wasOrbiting = this.orbiting;

        return { eyePosition: this.eyePosition, viewMatrix: this.V };
    }
}