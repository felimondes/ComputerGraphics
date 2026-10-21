export class CameraController {
    constructor(canvas) {
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
        this.orbiting = false;
        this.wasOrbiting = false;
        this.cameraAngle = 0;
        this.previousFrameTime = 0;

        const outputs = new Map(
            Array.from(controls.querySelectorAll("[data-slider-output]"))
                .map((output) => [output.dataset.sliderOutput, output])
        );

        for (const input of controls.querySelectorAll("[data-slider-key]")) {
            const key = input.dataset.sliderKey;
            const output = outputs.get(key);
            const value = Number(input.value);

            if (!key || !Number.isFinite(value)) {
                throw new Error("Camera sliders require a key and numeric value.");
            }

            this.values[key] = value;
            this.updateOutput(output, value, input.step);

            input.addEventListener("input", () => {
                const nextValue = Number(input.value);
                if (!Number.isFinite(nextValue)) {
                    return;
                }

                this.values[key] = nextValue;
                this.updateOutput(output, nextValue, input.step);
            });
        }

        this.eyePosition = vec3(
            this.values.eyeX,
            this.values.eyeY,
            this.values.eyeZ
        );
        this.V = lookAt(this.eyePosition, vec3(0, 0, 0), this.up);
        this.P = perspective(45, canvas.width / canvas.height, 0.01, 100);

        this.button = document.getElementById("toggle-orbit");
        if (!this.button) {
            throw new Error("Camera orbit control is missing from the page.");
        }

        this.button.addEventListener("click", () => {
            this.orbiting = !this.orbiting;
            if (this.orbiting) {
                this.cameraAngle = 0;
                this.previousFrameTime = 0;
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
            nextEyePosition = vec3(
                this.values.eyeX * cosAngle + this.values.eyeZ * sinAngle,
                this.values.eyeY,
                -this.values.eyeX * sinAngle + this.values.eyeZ * cosAngle
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

        try {
            const nextViewMatrix = lookAt(nextEyePosition, vec3(0, 0, 0), this.up);
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

        return this.orbiting
            ? { eyePosition: this.eyePosition, viewMatrix: this.V }
            : null;
    }
}