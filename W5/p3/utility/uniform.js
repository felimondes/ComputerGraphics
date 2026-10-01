const uniformTypes = {
    f32: {
        alignment: 4,
        byteLength: 4
    },

    vec2: {
        alignment: 8,
        byteLength: 8
    },

    vec3: {
        alignment: 16,
        byteLength: 12
    },

    vec4: {
        alignment: 16,
        byteLength: 16
    },

    mat4: {
        alignment: 16,
        byteLength: 64
    }
};

export function createBufferAndLayout(device, layout) {

    const uniformLayout = calculateUniformLayout(layout);

    const uniformBuffer = device.createBuffer({
        size: uniformLayout.byteLength,
        usage:
            GPUBufferUsage.UNIFORM |
            GPUBufferUsage.COPY_DST
    });

    return {
        buffer: uniformBuffer,
        layout: uniformLayout
    };
}

export function add(device, uniform, values) {

    const data = new ArrayBuffer(
        uniform.layout.byteLength
    );

    for (const item of uniform.layout.items) {

        const value = values[item.name];

        if (value === undefined) {
            throw new Error(
                `Missing uniform value: ${item.name}`
            );
        }

        writeUniform(
            data,
            value,
            item.offset,
            item.type
        );
    }

    device.queue.writeBuffer(
        uniform.buffer,
        0,
        data
    );
}

export function createBindGroup(device, uniformBuffer, pipeline) {
    return device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{
            binding: 0,
            resource: { buffer: uniformBuffer }
        }],
    });
}

//Return items in the buffer (name, type, their offset) + total space needed
function calculateUniformLayout(layout) {
    let offset = 0;
    const items = [];

    for (const variable of layout) {

        const info = uniformTypes[variable.type];

        if (!info) {
            throw new Error(
                `Unknown uniform type: ${variable.type}`
            );
        }

        offset = alignOffset(
            offset,
            info.alignment
        );
        items.push({
            name: variable.name,
            type: variable.type,
            offset: offset
        });

        offset += info.byteLength;
    }
    return {
        items,
        byteLength: alignOffset(offset, 16)
    };
}

function writeUniform(
    data,
    value,
    offset,
    type
) {

    if (type === "f32") {

        new Float32Array(
            data,
            offset,
            1
        )[0] = value;

    }

    else if (type === "vec2") {

        new Float32Array(
            data,
            offset,
            2
        ).set(value);

    }

    else if (type === "vec3") {

        new Float32Array(
            data,
            offset,
            3
        ).set(value);

    }

    else if (type === "vec4") {

        new Float32Array(
            data,
            offset,
            4
        ).set(value);

    }

    else if (type === "mat4") {

        new Float32Array(
            data,
            offset,
            16
        ).set(flatten(value));

    }
}

function alignOffset(offset, alignment) {
    return Math.ceil(offset / alignment) * alignment;
}