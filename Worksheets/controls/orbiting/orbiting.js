export class OrbitController {
    constructor() {
        this.orbiting = false;
        this.cameraAngle = 0;
        this.previousFrameTime = 0;

        this.button = document.getElementById("toggle-orbit");

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

    update(timestamp, values) {

        const deltaTime =
            this.previousFrameTime === 0
                ? 0
                : (timestamp - this.previousFrameTime) / 1000;

        this.previousFrameTime = timestamp;

        if (!this.orbiting) {
            return null;
        }

        this.cameraAngle += deltaTime;

        const cosAngle = Math.cos(this.cameraAngle);
        const sinAngle = Math.sin(this.cameraAngle);
        const eyePosition = vec3(
            values.eyeX * cosAngle + values.eyeZ * sinAngle,
            values.eyeY,
            -values.eyeX * sinAngle + values.eyeZ * cosAngle
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