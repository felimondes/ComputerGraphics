struct Uniforms {
    V: mat4x4f,
    P: mat4x4f,
};

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

struct VertexInput {
    @location(0) position: vec4f,
    @location(2) model0: vec4f,
    @location(3) model1: vec4f,
    @location(4) model2: vec4f,
    @location(5) model3: vec4f,
};

@vertex
fn main_vs(input: VertexInput) -> @builtin(position) vec4f {
    let shadowModel = mat4x4f(
        input.model0,
        input.model1,
        input.model2,
        input.model3
    );
    return uniforms.P * uniforms.V * shadowModel * input.position;
}

@fragment
fn main_fs() -> @location(0) vec4f {
    return vec4f(0, 0, 0, 0.4);
}
