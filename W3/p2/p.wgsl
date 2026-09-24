struct Uniforms {
    view: mat4x4f, //constant
    projection: mat4x4f, //constant
    color: vec4f
};

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

struct VertexInput {
    @location(0) position: vec3f,

    // One mat4 occupies four vertex attributes.
    @location(1) model0: vec4f,
    @location(2) model1: vec4f,
    @location(3) model2: vec4f,
    @location(4) model3: vec4f,
};


@vertex
fn main_vs(input: VertexInput) -> @builtin(position) vec4f
{
    let model = mat4x4f(
        input.model0,
        input.model1,
        input.model2,
        input.model3
    );

    return uniforms.projection
         * uniforms.view
         * model
         * vec4f(input.position, 1.0);
}

@fragment
fn main_fs() -> @location(0) vec4f
{
    return uniforms.color;
}