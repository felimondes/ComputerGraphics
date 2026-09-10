import * as circle from "./objects/circle.js";
import * as rectangle from "./objects/rectangle.js";
import * as square from "./objects/square.js";


export class ObjectsController {
    constructor({
        onAdd
    }) {
        this.onAdd = onAdd;
        this.factoryMap2D = {
            circle: () => circle.createRandom(),
            rectangle: () => rectangle.createRandom(),
            square: () => square.makeSquare()
        }
        this.bindButtons();
    }

    bindButtons() {
        for (const [type, factory] of Object.entries(this.factoryMap2D)) {
            const buttonId =`add${this.capitalize(type)}`;
            const button = document.getElementById(buttonId);

            if (button) {
                button.addEventListener("click", () => {
                    const object = factory(); //calls the function
                    this.onAdd(object)
                });
            }
        }
    }

    capitalize(value) {
        return value.charAt(0).toUpperCase() + value.slice(1);
    }
}
