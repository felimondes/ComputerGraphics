struct Uniforms {
    view: mat4x4f,
    projection: mat4x4f
};

const lightEmission = vec3f(1.0, 1.0, 1.0);
const lightDirection = vec3f(0.0, 0.0, -1.0);

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


    //work in world coordinate
    //The sphere has center at origo, means the position vector, is actually the normal vector
     //w = 0, so directional light
    let normal = (model * vec4f(input.position, 0.0)).xyz;
    let incomingDirection = -lightDirection;
    let angle = dot(normal, incomingDirection);
    let diffuse = max(angle, 0.0); //change based on the light, normal and angle
    let kd = input.color.rgb;
    
    output.color = vec4f(kd * lightEmission * diffuse, input.color.a);
    return output;
}

@fragment
fn main_fs(input: VertexOutput) -> @location(0) vec4f
{
    return input.color;
}