// import { randomBetween } from "../functions.js";
// import { Object } from "./object.js";


// export function makeSquare(center = vec3(
//         randomBetween(-0.5, 0.5),
//         randomBetween(-0.5, 0.5),
//         0
// )) {
//         let s = new Square(center, 0.5)
//         s.rotation = vec3(0.0, 0.0, 0.0);
//         s.angularVelocity = vec3(0, 0, 0);
//         s.velocity = vec3(0.0, 0.01, 0.0);
//         s.acceleration = vec3(0.0, 0.0, 0.0);
//         return s
//     }

    


// export class Square extends Object {
//     //This called is generated using AI

//     constructor(center, size) {
//         super(center);
//         this.size = size;
//         this.positions = this.createShape();
//         this.aab = this.updateAABB();
//     }

//     updateAABB() {
//         return {
//             width: this.size,
//             height: this.size
//         }
//     }

//     createShape() {
//         const half = this.size / 2;
//         const topLeft = vec3(-half,  half, 0);
//         const topRight = vec3( half,  half, 0);
//         const bottomLeft = vec3(-half, -half, 0);
//         const bottomRight = vec3( half, -half, 0);

//         return [
//             // Triangle 1
//             topLeft,
//             bottomLeft,
//             topRight,

//             // Triangle 2
//             bottomLeft,
//             bottomRight,
//             topRight
//         ];
//     }

//     getBoundingRadius() {
//         // Distance from center to a corner
//         return Math.sqrt(
//             (this.size / 2) ** 2 +
//             (this.size / 2) ** 2
//         );
//     }

// }