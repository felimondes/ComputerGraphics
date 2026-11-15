export function markBoundingSphereCollisions(objects, candidatePairs) {
    for (const object of objects) {
        object.isColliding = false;
    }

    const collidingPairs = [];
    for (const pair of candidatePairs) {
        const [first, second] = pair.objects;
        if (!boundingSpheresOverlap(
            first.getBoundingVolume(),
            second.getBoundingVolume()
        )) {
            continue;
        }

        first.isColliding = true;
        second.isColliding = true;
        collidingPairs.push(pair);
    }
    return collidingPairs;
}

function boundingSpheresOverlap(first, second) {
    const radius = first.radius + second.radius;
    let distanceSquared = 0;
    for (let axis = 0; axis < 3; axis++) {
        const difference = first.center[axis] - second.center[axis];
        distanceSquared += difference * difference;
    }
    return distanceSquared <= radius * radius;
}
