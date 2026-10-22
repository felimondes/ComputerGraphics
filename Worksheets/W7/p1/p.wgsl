struct Uniforms {
    V: mat4x4f,
    P: mat4x4f,
    eyePosition: vec3f,
};



@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_cube<f32>;

struct VertexInput {
    @location(0) position: vec4f,
    @location(1) normal: vec4f,

    // One mat4 occupies four vertex attributes.
    @location(2) model0: vec4f,
    @location(3) model1: vec4f,
    @location(4) model2: vec4f,
    @location(5) model3: vec4f,
};


struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) normal: vec3f,
    @location(1) worldPosition: vec3f,
};

@vertex
fn main_vs(input: VertexInput) -> VertexOutput
{
    let model = mat4x4f(
        input.model0,
        input.model1,
        input.model2,
        input.model3
    );

    var output: VertexOutput;
    let worldPosition = model * input.position;
    output.position = uniforms.P * uniforms.V * worldPosition;
    output.normal = (model * vec4f(input.normal.xyz, 0.0)).xyz;
    output.worldPosition = worldPosition.xyz;
    return output;
}

@fragment
fn main_fs(input: VertexOutput) -> @location(0) vec4f
{
    return textureSample(myTexture, mySampler, normalize(input.normal));
}