// const MIN_SUBDIVISION = 0;
// const MAX_SUBDIVISION = 6;

// export function bindSubdivisionControls({
//     getLevel = () => 0,
//     setLevel = () => {},
//     onChange = () => {},
// } = {}) {
//     const decreaseButton = document.getElementById("decrease-subdivision");
//     const increaseButton = document.getElementById("increase-subdivision");
//     const levelLabel = document.getElementById("subdivision-level");

//     if (!decreaseButton || !increaseButton || !levelLabel) {
//         return;
//     }

//     const syncLabel = (level) => {
//         levelLabel.textContent = `Subdivision level: ${level}`;
//     };

//     const setSubdivisionLevel = (level) => {
//         const nextLevel = Math.max(
//             MIN_SUBDIVISION,
//             Math.min(MAX_SUBDIVISION, level)
//         );

//         setLevel(nextLevel);
//         syncLabel(nextLevel);
//         onChange(nextLevel);
//     };

//     decreaseButton.addEventListener("click", () => {
//         setSubdivisionLevel(getLevel() - 1);
//     });

//     increaseButton.addEventListener("click", () => {
//         setSubdivisionLevel(getLevel() + 1);
//     });

//     syncLabel(getLevel());
// }

// //Subdivison controls
// const MIN_SUBDIVISION = 0;
// const MAX_SUBDIVISION = 6;
// let subdivisionLevel = 0;

// document.getElementById("decrease-subdivision").addEventListener("click", () => {
//     setSubdivisionLevel(subdivisionLevel - 1);
// });
// document.getElementById("increase-subdivision").addEventListener("click", () => {
//     setSubdivisionLevel(subdivisionLevel + 1);
// });

// function setSubdivisionLevel(level) {
//     subdivisionLevel = Math.max(
//         MIN_SUBDIVISION,
//         Math.min(MAX_SUBDIVISION, level)
//     );

//     sphereShape = new Sphere(subdivisionLevel);
//     vertexBuffer = createVertexBuffer(device, sphereShape.positions);
//     indexBuffer = createIndexBuffer(device, sphereShape.indices);
//     document.getElementById("subdivision-level").textContent =
//         `Subdivision level: ${subdivisionLevel}`;

//     render();
// }