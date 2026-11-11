export async function loadSliderDefaults(settingsUrl, defaultValues, label) {
    const values = { ...defaultValues };
    if (!settingsUrl) {
        return values;
    }

    const response = await fetch(settingsUrl);
    if (!response.ok) {
        throw new Error(
            `Failed to load ${label} settings from ${settingsUrl}: ${response.status}`
        );
    }

    const settingsDocument = new DOMParser().parseFromString(
        await response.text(),
        "text/html"
    );
    for (const input of settingsDocument.querySelectorAll("input[data-slider-key]")) {
        const key = input.dataset.sliderKey;
        if (!Object.hasOwn(defaultValues, key)) {
            throw new Error(`Unknown ${label} setting: ${key}`);
        }

        const rawValue = input.getAttribute("value");
        const value = Number(rawValue);
        if (rawValue === null || rawValue.trim() === "" || !Number.isFinite(value)) {
            throw new Error(`Setting "${key}" in ${label} settings must be numeric.`);
        }
        values[key] = value;
    }

    return values;
}
