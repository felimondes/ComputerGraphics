struct Uniforms {
    P: mat4x4f,
};

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_2d<f32>;

struct VertexInput {
    @location(0) position: vec4f,
    @location(1) texCoords: vec2f,

}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) texCoords: vec2f,
};

@vertex
fn main_vs(input: VertexInput) -> VertexOutput
{   
    var output: VertexOutput;

    output.position = uniforms.P * input.position;
    output.texCoords = input.texCoords; 
    
    return output;
}

 @fragment
 fn main_fs(@location(0) texCoords: vec2f,) -> @location(0) vec4f
 {
    return textureSample(myTexture, mySampler, texCoords);
 }