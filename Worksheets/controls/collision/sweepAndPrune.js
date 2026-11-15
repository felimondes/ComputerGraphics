export class SweepAndPrune {
    constructor(axisCount = 3) {
        if (!Number.isInteger(axisCount) || axisCount < 1 || axisCount > 3) {
            throw new RangeError("SweepAndPrune axis count must be between 1 and 3.");
        }
        this.axisCount = axisCount;
        this.objectIds = new WeakMap();
        this.nextObjectId = 0;
        this.endpoints = Array.from({ length: axisCount }, () => []);
        this.pairs = new Map();
    }

    update(objects) {
        for (const pair of this.pairs.values()) {
            pair.axes.fill(false);
        }

        const projections = objects.map(object => {
            const id = this.getObjectId(object);
            const volume = object.getBoundingVolume();
            const radius = volume.radius;
            if (!Number.isFinite(radius) || radius < 0) {
                throw new RangeError("SAP objects must have a nonnegative finite bounding radius.");
            }
            return { object, id, center: volume.center, radius };
        });
        const activeIds = new Set(projections.map(item => item.id));

        for (let axis = 0; axis < this.axisCount; axis++) {
            const endpointList = this.endpoints[axis].filter(
                endpoint => activeIds.has(endpoint.id)
            );
            const hasPreviousOrder = endpointList.length > 0;
            const endpointByKey = new Map(
                endpointList.map(endpoint => [
                    `${endpoint.id}:${endpoint.isStart ? "start" : "end"}`,
                    endpoint,
                ])
            );

            for (const projection of projections) {
                const center = projection.center[axis];
                const endpoints = [
                    { isStart: true, value: center - projection.radius },
                    { isStart: false, value: center + projection.radius },
                ];
                for (const endpointData of endpoints) {
                    const key = `${projection.id}:${endpointData.isStart ? "start" : "end"}`;
                    let endpoint = endpointByKey.get(key);
                    if (!endpoint) {
                        endpoint = {
                            ...endpointData,
                            id: projection.id,
                            object: projection.object,
                        };
                        endpointList.push(endpoint);
                        endpointByKey.set(key, endpoint);
                    } else {
                        endpoint.value = endpointData.value;
                        endpoint.object = projection.object;
                    }
                }
            }

            if (hasPreviousOrder) {
                insertionSortEndpoints(endpointList);
            } else {
                endpointList.sort(compareEndpoints);
            }
            this.endpoints[axis] = endpointList;
            this.sweepAxis(endpointList, axis);
        }

        for (const [key, pair] of this.pairs) {
            if (!pair.axes.some(Boolean)) {
                this.pairs.delete(key);
            }
        }

        for (const object of objects) {
            object.isColliding = false;
        }
        const collidingPairs = [];
        for (const pair of this.pairs.values()) {
            if (pair.axes.every(Boolean)) {
                pair.objects[0].isColliding = true;
                pair.objects[1].isColliding = true;
                collidingPairs.push(pair);
            }
        }
        return { pairs: this.pairs, collidingPairs };
    }

    sweepAxis(endpoints, axis) {
        const active = new Map();
        for (const endpoint of endpoints) {
            if (endpoint.isStart) {
                for (const [otherId, otherObject] of active) {
                    const firstId = Math.min(endpoint.id, otherId);
                    const secondId = Math.max(endpoint.id, otherId);
                    const key = `${firstId}:${secondId}`;
                    let pair = this.pairs.get(key);
                    if (!pair) {
                        pair = {
                            objects: endpoint.id < otherId
                                ? [endpoint.object, otherObject]
                                : [otherObject, endpoint.object],
                            axes: Array(this.axisCount).fill(false),
                        };
                        this.pairs.set(key, pair);
                    }
                    pair.axes[axis] = true;
                }
                active.set(endpoint.id, endpoint.object);
            } else {
                active.delete(endpoint.id);
            }
        }
    }

    getObjectId(object) {
        let id = this.objectIds.get(object);
        if (id === undefined) {
            id = this.nextObjectId++;
            this.objectIds.set(object, id);
        }
        return id;
    }
}

function insertionSortEndpoints(endpoints) {
    let shifts = 0;
    const shiftLimit = endpoints.length * Math.ceil(
        Math.log2(endpoints.length + 1)
    );
    for (let index = 1; index < endpoints.length; index++) {
        const endpoint = endpoints[index];
        let position = index - 1;
        while (
            position >= 0 &&
            compareEndpoints(endpoints[position], endpoint) > 0
        ) {
            endpoints[position + 1] = endpoints[position];
            position--;
            shifts++;
            if (shifts > shiftLimit) {
                endpoints[position + 1] = endpoint;
                endpoints.sort(compareEndpoints);
                return;
            }
        }
        endpoints[position + 1] = endpoint;
    }
}

function compareEndpoints(first, second) {
    return first.value - second.value ||
        Number(!first.isStart) - Number(!second.isStart) ||
        first.id - second.id;
}
