export class Object {

    constructor() {

        if (new.target === Object) {
            throw new Error(
                "Object is an abstract class and cannot be instantiated directly."
            );
        }
        this.center = vec3(0, 0, 0);
        this.velocity = vec3(0, 0, 0),
        this.theta = 0; //rotate angle in polar coordinates
        this.angularVelocity = vec3(0, 0, 0);
        this.color = vec3(1, 1, 1);
    }


    getBoundingRadius(){
        throw new Error(
            "getBoundingRadius must be implemented by the subclass."
        );
    }
    

    createShape() {
        throw new Error(
            "createShape must be implemented by the subclass."
        );
    }


    getModelMatrix() {
        throw new Error(
            "getModelMatrix() must be implemented by the subclass."
        );
    }
}
