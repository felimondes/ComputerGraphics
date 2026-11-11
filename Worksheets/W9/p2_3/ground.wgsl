struct Uniforms {
    V: mat4x4f,
    P: mat4x4f,
    lightViewProj: mat4x4f,
};

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_2d<f32>;
@group(0) @binding(3) var shadowMap: texture_2d<f32>;

struct VertexInput {
    @location(0) position: vec4f,
    @location(1) texCoords: vec2f,
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) texCoords: vec2f,
    @location(1) worldPosition: vec3f,
}

@vertex
fn main_vs(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = uniforms.P * uniforms.V * input.position;
    output.texCoords = input.texCoords;
    output.worldPosition = input.position.xyz;
    return output;
}

@fragment
fn main_fs(input: VertexOutput) -> @location(0) vec4f {
    let lightClip = uniforms.lightViewProj * vec4f(input.worldPosition, 1.0);
    let lightNdc = lightClip.xyz / lightClip.w;
    let shadowUV = lightNdc.xy * vec2f(0.5, -0.5) + vec2f(0.5, 0.5);
    var visibility = 1.0;
    if (all(shadowUV >= vec2f(0.0)) && all(shadowUV < vec2f(1.0)) &&
        lightNdc.z >= 0.0 && lightNdc.z <= 1.0) {
        let mapSize = textureDimensions(shadowMap);
        let texel = vec2i(shadowUV * vec2f(mapSize));
        let lightDepth = textureLoad(shadowMap, texel, 0).r;
        if (lightDepth < lightNdc.z - 0.003) {
            visibility = 0.35;
        }
    }

    return textureSample(myTexture, mySampler, input.texCoords) * visibility;
}
