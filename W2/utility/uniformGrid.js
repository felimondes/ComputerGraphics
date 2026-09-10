
// function _argumentsToArray( args )
// {
//     return [].concat.apply( [], Array.prototype.slice.apply(args) );
// }
// function vec3()
// {
//     var result = _argumentsToArray( arguments );

//     switch ( result.length ) {
//     case 0: result.push( 0.0 );
//     case 1: result.push( 0.0 );
//     case 2: result.push( 0.0 );
//     }

//     return result.splice( 0, 3 );
// }

export class UniformGrid {

    constructor(world, cellSize = (1 / 4)) {
        this.world = world;
        this.cellSize = cellSize;
        this.grid = this.partitionWorldIntoGrid(world);
    }


    partitionWorldIntoGrid(world) {
        const grid = new Map();

        const min = world.min;
        const max = world.max;

        const sizeX = Math.ceil(
            (max[0] - min[0]) / this.cellSize
        );

        const sizeY = Math.ceil(
            (max[1] - min[1]) / this.cellSize
        );

        const sizeZ = Math.ceil(
            (max[2] - min[2]) / this.cellSize
        );

        for (let x = 0; x < sizeX; x++) {
            for (let y = 0; y < sizeY; y++) {
                for (let z = 0; z < sizeZ; z++) {

                    const key = this.gridKey(x, y, z);

                    grid.set(key, {
                        objects: []
                    });
                }
            }
        }

        return grid;
    }


    gridKey(x, y, z) {
        return `${x},${y},${z}`;
    }


    getGridLocation(position) {

        const getCellIndex = (axis, value) => {
            const size = Math.max(
                1,
                Math.ceil(
                    (this.world.max[axis] - this.world.min[axis]) / this.cellSize
                )
            );

            const cell = Math.floor(
                (value - this.world.min[axis]) / this.cellSize
            );

            return Math.min(Math.max(cell, 0), size - 1);
        };

        return {
            x: getCellIndex(0, position[0]),
            y: getCellIndex(1, position[1]),
            z: getCellIndex(2, position[2])
        };
    }


    clearGrid() {
        for (const cell of this.grid.values()) {
            cell.objects = [];
        }
    }


    addObjectToGrid(object) {

        const aabb = object.aabb;
        const minCell = this.getGridLocation(aabb.min);
        const maxCell = this.getGridLocation(aabb.max);

        for (let x = minCell.x; x <= maxCell.x; x++) {
            for (let y = minCell.y; y <= maxCell.y; y++) {
                for (let z = minCell.z; z <= maxCell.z; z++) {

                    const key = this.gridKey(x, y, z);
                    const cell = this.grid.get(key);

                    // Ignore cells outside the grid
                    if (cell) {
                        cell.objects.push(object);
                    }
                }
            }
        }
    }


    assignGridLocationsToObjects(objects) {

        this.clearGrid();

        for (const object of objects) {
            this.addObjectToGrid(object);
        }
    }


    isAABBsColliding(aabb0, aabb1) {

        return (
            aabb0.min[0] <= aabb1.max[0] &&
            aabb0.max[0] >= aabb1.min[0] &&

            aabb0.min[1] <= aabb1.max[1] &&
            aabb0.max[1] >= aabb1.min[1] &&

            aabb0.min[2] <= aabb1.max[2] &&
            aabb0.max[2] >= aabb1.min[2]
        );
    }


    actualObjectCollision(objectA, objectB) {

        const verticesA = this.getWorldVertices(objectA);
        const verticesB = this.getWorldVertices(objectB);

        const trianglesA = [];
        const trianglesB = [];

        for (let i = 0; i < verticesA.length; i += 3) {
            trianglesA.push([
                verticesA[i],
                verticesA[i + 1],
                verticesA[i + 2]
            ]);
        }

        for (let i = 0; i < verticesB.length; i += 3) {
            trianglesB.push([
                verticesB[i],
                verticesB[i + 1],
                verticesB[i + 2]
            ]);
        }

        for (const triangleA of trianglesA) {
            for (const vertexB of verticesB) {
                if (this.isPointInTriangle(vertexB, triangleA[0], triangleA[1], triangleA[2])) {
                    return true;
                }
            }
        }

        for (const triangleB of trianglesB) {
            for (const vertexA of verticesA) {
                if (this.isPointInTriangle(vertexA, triangleB[0], triangleB[1], triangleB[2])) {
                    return true;
                }
            }
        }

        return false;
    }


    getWorldVertices(object) {
        const modelMatrix = object.getModelMatrix();

        return object.positions.map((position) => {
            const transformed = mult(
                modelMatrix,
                vec4(position[0], position[1], position[2], 1)
            );

            return vec3(
                transformed[0],
                transformed[1],
                transformed[2]
            );
        });
    }


    isPointInTriangle(point, a, b, c) {
        const totalArea = this.triangleArea(a, b, c);

        if (totalArea <= 0) {
            return false;
        }

        const areaABP = this.triangleArea(a, b, point);
        const areaBCP = this.triangleArea(b, c, point);
        const areaCAP = this.triangleArea(c, a, point);

        const areaSum = areaABP + areaBCP + areaCAP;

        return Math.abs(totalArea - areaSum) < 0.000001;
    }


    triangleArea(a, b, c) {
        return Math.abs(
            ((b[0] - a[0]) * (c[1] - a[1])) -
            ((c[0] - a[0]) * (b[1] - a[1]))
        ) / 2;
    }


    isAABBCollisions(objects) {

        // Put every object into the cells
        // that its AABB overlaps.
        this.assignGridLocationsToObjects(objects);

        const checkedPairs = new Set();
        const AABBcollisions = [];

        // Go through every grid cell
        for (const cell of this.grid.values()) {

            const objectsInCell = cell.objects;

            // If there are fewer than 2 objects,
            // there is no pair to check.
            if (objectsInCell.length < 2) {
                continue;
            }

            console.log("2 objects in a cell!")

            // Compare every pair of objects in this cell
            for (let i = 0; i < objectsInCell.length; i++) {

                for (let j = i + 1; j < objectsInCell.length; j++) {

                    const objectA = objectsInCell[i];
                    const objectB = objectsInCell[j];

                    // Create a unique pair ID.
                    const idA = Math.min(
                        objectA.id,
                        objectB.id
                    );

                    const idB = Math.max(
                        objectA.id,
                        objectB.id
                    );

                    const pairKey = `${idA}-${idB}`;

                    // The same two objects can be in multiple
                    // cells, so don't check them twice.
                    if (checkedPairs.has(pairKey)) {
                        continue;
                    }

                    checkedPairs.add(pairKey);

                    // Narrow phase:
                    // Check whether their AABBs actually overlap.
                    if (!this.isAABBsColliding(
                        objectA.aabb,
                        objectB.aabb
                    )) {
                        continue;
                    }

                    // Extra verification: only claim a real collision
                    // if one object's vertices actually intersect the other.
                    if (this.actualObjectCollision(
                        objectA,
                        objectB
                    )) {
                        AABBcollisions.push([
                            objectA,
                            objectB
                        ]);
                    }
                }
            }
        }

        return AABBcollisions;
    }
}


// // --------------------------------------------------
// // TEST
// // --------------------------------------------------

// const objects = [

//     {
//         id: 0,

//         position: vec3(0, 0, 0),

//         aabb: {
//             min: vec3(-1, -1, -1),
//             max: vec3(1, 1, 1)
//         }
//     },

//     {
//         id: 1,

//         position: vec3(0, 0, 0),

//         aabb: {
//             min: vec3(-1, -1, -1),
//             max: vec3(1, 1, 1)
//         }
//     }
// ];


// const world = {
//     min: vec3(-1, -1, -1),
//     max: vec3(1, 1, 1)
// };


// const collisions = new Collisions(
//     world,
//     0.25
// );


// const result = collisions.isAABBCollisions(objects);

// console.log(result);