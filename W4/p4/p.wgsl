struct Uniforms {
    view: mat4x4f,
    projection: mat4x4f,
    kd: f32,
    ks: f32,
    s: f32,
    Le: f32,
    La: f32,
    cameraPosition: vec3f,
};

const le = vec3f(0.0, 0.0, -1.0);

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

struct VertexInput {
    @location(0) position: vec3f,
    @location(5) color: vec4f,

    // One mat4 occupies four vertex attributes.
    @location(1) model0: vec4f,
    @location(2) model1: vec4f,
    @location(3) model2: vec4f,
    @location(4) model3: vec4f,
};


struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
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
    output.position = uniforms.projection
                    * uniforms.view
                    * model
                    * vec4f(input.position, 1.0);

    let worldPosition = (model * vec4f(input.position, 1.0)).xyz;
    let n = normalize((model * vec4f(input.position, 0.0)).xyz);
    let wi = -le;
    let wo = normalize(uniforms.cameraPosition - worldPosition);
    let kd = uniforms.kd * input.color.rgb;
    let ka = kd;
    let V = 1.0;
    let Li = V * uniforms.Le * vec3f(1.0, 1.0, 1.0);
    let La = uniforms.La * vec3f(1.0, 1.0, 1.0);
    let ks = uniforms.ks * vec3f(1.0, 1.0, 1.0);
    let R = reflect(-wi, n);

    let Lr_d = kd * Li * max(dot(n, wi), 0.0);
    let Lr_a = ka * La;
    let specularFactor = select(
        0.0,
        pow(max(dot(R, wo), 0.0), uniforms.s),
        dot(n, wi) > 0.0
    );
    let Lr_s = ks * Li * specularFactor;
    let Lo = Lr_d + Lr_a + Lr_s;
    output.color = vec4f(Lo, input.color.a);
    return output;
}

@fragment
fn main_fs(input: VertexOutput) -> @location(0) vec4f
{
    return input.color;
}