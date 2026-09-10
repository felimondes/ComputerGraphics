let nextObjectId = 0;

export class Object {

    constructor(center) {
        if (new.target === Object) {
            throw new Error(
                "Object is an abstract class and cannot be instantiated directly."
            );
        }

        this.id = nextObjectId++;
        this.positions;
        this.aabb;

        this.center = center;
        this.velocity = vec3(0, 0, 0);
        this.acceleration = vec3(0, 0, 0);
        this.rotation = vec3(0, 0, 0);
        this.angularVelocity = vec3(0, 0, 0);
    }

    updateAABB() {
        throw new Error(
            "updateAABB must be implemented by the subclass."
        );
    }


    getNextVelocity() {
        return add(this.velocity, this.acceleration);
    }

    getNextPosition() {
        return add(this.center, this.getNextVelocity());
    }

    getModelMatrix() {
        const translation =
            translate(
                this.center[0],
                this.center[1],
                this.center[2]
            );

        const rotationX =
            rotateX(this.rotation[0]);

        const rotationY =
            rotateY(this.rotation[1]);

        const rotationZ =
            rotateZ(this.rotation[2]);

        const rotation =
            mult(
                rotationZ,
                mult(rotationY, rotationX)
            );

        return mult(
            translation,
            rotation
        );
    }


    getBoundingRadius() {
        throw new Error(
            "getBoundingRadius must be implemented by the subclass."
        );
    }


    createShape() {
        throw new Error(
            "createShape must be implemented by the subclass."
        );
    }

}
