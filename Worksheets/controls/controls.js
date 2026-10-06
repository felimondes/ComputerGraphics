export async function loadControlPanels() {
    const panels = [
        ["orbiting", "./orbiting/orbiting.html"],
        ["subdivisions", "./subdivisions/subdivisions.html"],
        ["valueSliders", "./valueSliders/valueSliders.html"],
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
