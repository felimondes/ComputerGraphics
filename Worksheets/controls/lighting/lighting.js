import { loadSliderDefaults } from "../settings.js";

const DEFAULT_LIGHTING_VALUES = {
    kd: 0.5,
    ks: 0.5,
    s: 70,
    Le: 1,
    La: 1,
};

export class LightingController {
    constructor(settingsUrl = null) {
        this.values = {};
        const controls = document.getElementById("lighting");
        if (!controls) {
            throw new Error("Lighting controls are missing from the page.");
        }
        this.controls = controls;
        this.ready = this.initialize(settingsUrl);
    }

    async initialize(settingsUrl) {
        const defaultValues = await loadSliderDefaults(
            settingsUrl,
            DEFAULT_LIGHTING_VALUES,
            "lighting"
        );
        const outputs = new Map(
            Array.from(this.controls.querySelectorAll("[data-slider-output]"))
                .map((output) => [output.dataset.sliderOutput, output])
        );

        for (const input of this.controls.querySelectorAll("[data-slider-key]")) {
            const key = input.dataset.sliderKey;
            const output = outputs.get(key);
            if (!Object.hasOwn(defaultValues, key)) {
                throw new Error(`Unknown lighting control: ${key}`);
            }
            const value = defaultValues[key];
            if (!Number.isFinite(value)) {
                throw new Error(`Lighting setting "${key}" must be numeric.`);
            }
            if (
                (input.min !== "" && input.min !== undefined && value < Number(input.min)) ||
                (input.max !== "" && input.max !== undefined && value > Number(input.max))
            ) {
                throw new Error(`Lighting setting "${key}" is outside its slider range.`);
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
            });
        }

        if (Object.keys(this.values).length !== Object.keys(DEFAULT_LIGHTING_VALUES).length) {
            throw new Error("Lighting controls are missing one or more sliders.");
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