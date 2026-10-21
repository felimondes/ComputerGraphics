export async function loadControlPanels() {
    const panels = [
        ["camera", "./camera/camera.html"],
        ["subdivisions", "./subdivisions/subdivisions.html"],
        ["lighting", "./lighting/lighting.html"],
        ["textures", "./textures/textures.html"]
    ];

    await Promise.all(
        panels.map(async ([id, path]) => {
            const container = document.getElementById(id);
            if (!container) {
                return;
            }

            const url = new URL(path, import.meta.url);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load control panel: ${url}`);
            }
            container.innerHTML = await response.text();
        })
    );
}
