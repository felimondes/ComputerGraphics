export class AnimationController {
  constructor({
    onStep,
    startPauseButton = document.getElementById("startPause"),
    nextFrameButton = document.getElementById("nextFrame")
  }) {
    this.isPaused = false;
    this.onStep = onStep;

    this.startPauseButton = startPauseButton;
    this.nextFrameButton = nextFrameButton;

    this.bindButtons();
  }

  bindButtons() {
    if (this.startPauseButton) {
      this.startPauseButton.addEventListener("click", () => {
        this.togglePause();
      });
    }

    if (this.nextFrameButton) {
      this.nextFrameButton.addEventListener("click", () => {
        this.nextFrame();
      });
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;

    if (!this.isPaused) {
      this.startLoop();
    }
  }

  nextFrame() {
    if (this.isPaused) {
      for (let i = 0; i < 1; i++) {
        this.onStep();
      }
    }
  }

  startLoop() {
    if (this.isPaused) return;

    requestAnimationFrame(() => {
      if (this.isPaused) return;
      this.onStep();
      this.startLoop();
    });
  }
}