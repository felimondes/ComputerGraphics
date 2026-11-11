struct DepthUniforms {
    lightViewProj: mat4x4f,
};

@group(0) @binding(0)
var<uniform> uniforms: DepthUniforms;

struct ObjectVertexInput {
    @location(0) position: vec4f,
    @location(2) model0: vec4f,
    @location(3) model1: vec4f,
    @location(4) model2: vec4f,
    @location(5) model3: vec4f,
};

struct GroundVertexInput {
    @location(0) position: vec4f,
    @location(1) texCoords: vec2f,
};

@vertex
fn main_vs_depth(input: ObjectVertexInput) -> @builtin(position) vec4f {
    let model = mat4x4f(
        input.model0,
        input.model1,
        input.model2,
        input.model3
    );
    return uniforms.lightViewProj * model * input.position;
}

@vertex
fn main_vs_ground_depth(input: GroundVertexInput) -> @builtin(position) vec4f {
    return uniforms.lightViewProj * input.position;
}

@fragment
fn main_fs_depth(@builtin(position) fragCoord: vec4f) -> @location(0) f32 {
    return fragCoord.z;
}
