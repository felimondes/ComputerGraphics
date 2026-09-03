export function createUniformBuffer(device, variables) {
    const uniforms = createUniformData(variables);

    const uniformBuffer = device.createBuffer({
        size: uniforms.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(uniformBuffer, 0, uniforms);

    return uniformBuffer;
}


export function updateUniformBuffer(device, uniformBuffer, variables) {
    const uniforms = createUniformData(variables);

    device.queue.writeBuffer(
        uniformBuffer,
        0,
        uniforms
    );
}

function getUniformInfo(variable) {
    if (typeof variable === "number") {
        return {
            alignment: 4,
            byteLength: 4,
            type: "f32"
        };
    }

    if (typeof variable === "boolean") {
        return {
            alignment: 4,
            byteLength: 4,
            type: "bool"
        };
    }

    if (Array.isArray(variable)) {
        if (variable.length === 2) {
            return {
                alignment: 8,
                byteLength: 8,
                type: "vec2"
            };
        }

        if (variable.length === 3) {
            return {
                alignment: 16,
                byteLength: 12,
                type: "vec3"
            };
        }

        if (variable.length === 4) {
            return {
                alignment: 16,
                byteLength: 16,
                type: "vec4"
            };
        }
    }

    throw new Error("Unsupported uniform type");
}

function alignOffset(offset, alignment) {
    return Math.ceil(offset / alignment) * alignment;
}

function calculateUniformLayout(variables) {
    let offset = 0;
    const layout = [];

    for (const variable of variables) {
        const info = getUniformInfo(variable);

        offset = alignOffset(offset, info.alignment);

        layout.push({
            variable,
            offset,
            type: info.type
        });

        offset += info.byteLength;
    }

    const byteLength = alignOffset(offset, 16);

    return {
        layout,
        byteLength
    };
}


function writeUniform(uniforms, variable, offset, type) {
    if (type === "f32") {
        new Float32Array(uniforms, offset, 1)[0] = variable;
    }

    else if (type === "bool") {
        new Uint32Array(uniforms, offset, 1)[0] =
            variable ? 1 : 0;
    }

    else if (type === "vec2" ||
        type === "vec3" ||
        type === "vec4") {
        new Float32Array(uniforms, offset, variable.length)
            .set(variable);
    }
}

function createUniformData(variables) {
    const { layout, byteLength } =
        calculateUniformLayout(variables);

    const uniforms = new ArrayBuffer(byteLength);

    for (const item of layout) {
        writeUniform(
            uniforms,
            item.variable,
            item.offset,
            item.type
        );
    }

    return uniforms;
}
