struct Uniforms {
    V: mat4x4f,
    P: mat4x4f,
    eyePosition: vec3f,
    Mtex: mat4x4f,
    reflective: f32,
};

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_cube<f32>;
@group(1) @binding(0) var normalMapSampler: sampler;
@group(1) @binding(1) var normalMapTexture: texture_2d<f32>;

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
    @location(0) textureDirection: vec3f,
    @location(1) worldPosition: vec3f,
    @location(2) worldNormal: vec3f,
};

fn rotate_to_normal(n: vec3f, v: vec3f) -> vec3f {
    let sgn_nz = sign(n.z + 1.0e-16);
    let a = -1.0 / (1.0 + abs(n.z));
    let b = n.x * n.y * a;
    return vec3f(1.0 + n.x * n.x * a, b, -sgn_nz * n.x) * v.x
        + vec3f(sgn_nz * b, sgn_nz * (1.0 + n.y * n.y * a), -n.y) * v.y
        + n * v.z;
}

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
    output.textureDirection = (uniforms.Mtex * input.position).xyz;
    output.worldPosition = worldPosition.xyz;
    output.worldNormal = (model * vec4f(input.normal.xyz, 0.0)).xyz;
    return output;
}

@fragment
fn main_fs(input: VertexOutput) -> @location(0) vec4f
{
    var direction = input.textureDirection;
    if (uniforms.reflective > 0.5) {
        const PI: f32 = 3.14159265359;
        var n = normalize(input.worldNormal);
        let phi = atan2(n.z, n.x);
        let uv = vec2f(
            0.5 - phi / (2.0 * PI),
            acos(clamp(n.y, -1.0, 1.0)) / PI
        );
        let uvDx = dpdx(uv);
        let uvDy = dpdy(uv);
        var sampledNormal: vec3f;
        if (PI - abs(phi) < 0.1) {
            sampledNormal = textureSampleLevel(
                normalMapTexture, normalMapSampler, uv, 0.0
            ).rgb;
        } else {
            sampledNormal = textureSampleGrad(
                normalMapTexture,
                normalMapSampler,
                uv,
                uvDx,
                uvDy
            ).rgb;
        }

        let tangentNormal = sampledNormal * 2.0 - vec3f(1.0);
        n = normalize(rotate_to_normal(n, tangentNormal));

        let incidentDirection = input.worldPosition - uniforms.eyePosition;
        direction = reflect(incidentDirection, n);
    }
    return textureSample(myTexture, mySampler, normalize(direction));
}