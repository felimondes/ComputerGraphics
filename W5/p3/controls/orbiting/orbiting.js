export class OrbitController {
    constructor() {
        this.orbiting = false;
        this.cameraAngle = 0;
        this.previousFrameTime = 0;

        this.button = document.getElementById("toggle-orbit");

        this.button.addEventListener("click", () => {
            this.orbiting = !this.orbiting;

            this.button.textContent = this.orbiting
                ? "Stop orbit"
                : "Start orbit";
        });
    }

    update(timestamp, cameraRadius) {
        const deltaTime =
            this.previousFrameTime === 0
                ? 0
                : (timestamp - this.previousFrameTime) / 1000;

        this.previousFrameTime = timestamp;

        if (!this.orbiting) {
            return null;
        }

        this.cameraAngle += deltaTime;

        const eyePosition = vec3(
            cameraRadius * Math.sin(this.cameraAngle),
            0,
            cameraRadius * Math.cos(this.cameraAngle)
        );

        const viewMatrix = lookAt(
            eyePosition,
            vec3(0, 0, 0),
            vec3(0, 1, 0)
        );

        return {
            eyePosition,
            viewMatrix
        };
    }
}