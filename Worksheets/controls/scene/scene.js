export class SceneController {
    constructor(onToggle = () => {}) {
        if (typeof onToggle !== "function") {
            throw new TypeError("SceneController onToggle must be a function.");
        }

        this.running = true;
        const toggle = document.getElementById("toggle-scene");
        if (!toggle) {
            throw new Error("Scene toggle control is missing from the page.");
        }

        toggle.addEventListener("click", () => {
            this.running = !this.running;
            toggle.textContent = this.running ? "Stop scene" : "Start scene";
            onToggle(this.running);
        });
    }

    get isRunning() {
        return this.running;
    }
}
