
for (const [inputId, parameterName, outputId] of [
    ["kd", "kd", "kd-value"],
    ["ks", "ks", "ks-value"],
    ["shininess", "s", "shininess-value"],
    ["Le", "Le", "Le-value"],
    ["La", "La", "La-value"],
]) {
    const input = document.getElementById(inputId);
    const output = document.getElementById(outputId);

    if (!input) {
        continue;
    }

    input.value = String(currentState[parameterName] ?? DEFAULT_LIGHTING[parameterName]);
    if (output) {
        output.value = parameterName === "s"
            ? String(currentState[parameterName] ?? DEFAULT_LIGHTING[parameterName])
            : Number(currentState[parameterName] ?? DEFAULT_LIGHTING[parameterName]).toFixed(2);
    }

    input.addEventListener("input", () => {
        const value = Number(input.value);
        const nextState = {
            ...getState(),
            [parameterName]: value,
        };

        setState(nextState);
        if (output) {
            output.value = parameterName === "s" ? value : value.toFixed(2);
        }
        onChange(nextState);
    });
}