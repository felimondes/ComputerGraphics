export class ValueSliderController {
    constructor() {
        this.values = {};
        const outputs = new Map(
            Array.from(document.querySelectorAll("[data-slider-output]"))
                .map((output) => [output.dataset.sliderOutput, output])
        );

        for (const input of document.querySelectorAll("[data-slider-key]")) {
            const key = input.dataset.sliderKey;
            const output = outputs.get(key);
            const value = Number(input.value);

            if (!key || !Number.isFinite(value)) {
                throw new Error("Value sliders require a key and numeric value.");
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

        if (Object.keys(this.values).length === 0) {
            throw new Error("No value sliders were found.");
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