struct Uniforms {
    theta: f32,
};

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

@vertex
fn main_vs(@location(0) pos: vec2f) -> @builtin(position) vec4f
{
    let x = cos(uniforms.theta) * pos.x
           + sin(uniforms.theta) * (-pos.y);

    let y = cos(uniforms.theta) * pos.y
           + sin(uniforms.theta) * pos.x;

    return vec4f(x, y, 0.0, 1.0);
}

@fragment
fn main_fs() -> @location(0) vec4f
{
    return vec4f(1.0, 1.0, 1.0, 1.0);
}