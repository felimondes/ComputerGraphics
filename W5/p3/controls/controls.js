export async function loadControlPanels() {
    const panels = [
        ["orbiting", "controls/orbiting/orbiting.html"]
        // ["subdivisions", "subdivisions/subdivisions.html"],
        // ["lighting", "lighting/lighting.html"],
    ];

    await Promise.all(
        panels.map(async ([id, path]) => {
            const container = document.getElementById(id);
            if (!container) {
                return;
            }

            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load control panel: ${path}`);
            }
            container.innerHTML = await response.text();
        })
    );
}
