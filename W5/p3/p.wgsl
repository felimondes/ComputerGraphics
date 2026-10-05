struct Uniforms {
    V: mat4x4f,
    P: mat4x4f,
    kd: f32,
    ks: f32,
    s: f32,
    Le: f32,
    La: f32,
    eyePosition: vec3f,
};

const le = vec3f(0.0, 0.0, -1.0);
const diffuseColor = vec3f(1, 0.5, 0);
const specularColor = vec3f(1.0, 1.0, 1.0);

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

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
    let n = normalize(input.normal);
    let wi = normalize(-le);
    let wo = normalize(uniforms.eyePosition - input.worldPosition);
    let kd = uniforms.kd * diffuseColor;
    let ka = kd;
    let ks = uniforms.ks * specularColor;
    let Li = uniforms.Le * vec3f(1.0, 1.0, 1.0);
    let La = uniforms.La * vec3f(1.0, 1.0, 1.0);
    let R = normalize(reflect(-wi, n));

    let Lr_d = kd * Li * max(dot(n, wi), 0.0);
    let Lr_a = ka * La;
    let specularFactor = select(
        0.0,
        pow(max(dot(R, wo), 0.0), uniforms.s),
        dot(n, wi) > 0.0
    );
    let Lr_s = ks * Li * specularFactor;
    let Lo = Lr_d + Lr_a + Lr_s;
    return vec4f(Lo, 1.0);
}