struct Uniforms {
    V: mat4x4f,
    P: mat4x4f,
    lightViewProj: mat4x4f,
    shadowMapRes: f32,
};

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_2d<f32>;
@group(0) @binding(3) var shadowMap: texture_2d<f32>;

fn texture_pcf(shadowCoords: vec3f, epsilon: f32) -> f32 {
    var result = 0.0;
    for (var y = -1.5; y <= 1.5; y += 1.0) {
        for (var x = -1.5; x <= 1.5; x += 1.0) {
            let texCoords = vec2u(shadowCoords.xy * uniforms.shadowMapRes + vec2f(x, y));
            let depth = textureLoad(shadowMap, texCoords, 0).r;
            result += select(1.0, 0.0, depth < shadowCoords.z - epsilon);
        }
    }
    return result / 16.0;
}

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
        visibility = 0.35 + 0.65 *
            texture_pcf(vec3f(shadowUV, lightNdc.z), 0.003);
    }

    return textureSample(myTexture, mySampler, input.texCoords) * visibility;
}
