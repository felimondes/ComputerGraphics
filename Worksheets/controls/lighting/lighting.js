export class LightingController {
    constructor() {
        this.values = {};
        const controls = document.getElementById("lighting");
        if (!controls) {
            throw new Error("Lighting controls are missing from the page.");
        }

        const outputs = new Map(
            Array.from(controls.querySelectorAll("[data-slider-output]"))
                .map((output) => [output.dataset.sliderOutput, output])
        );

        for (const input of controls.querySelectorAll("[data-slider-key]")) {
            const key = input.dataset.sliderKey;
            const output = outputs.get(key);
            const value = Number(input.value);

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

        if (Object.keys(this.values).length === 0) {
            throw new Error("No lighting sliders were found.");
        }
    }

    updateOutput(output, value, step) {
        if (!output) {
            return;
        }

        const precision = step.includes(".") ? step.split(".")[1].length : 0;
        output.value = value.toFixed(precision);
    }
}