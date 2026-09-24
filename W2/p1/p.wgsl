// struct Uniforms {
//     model: mat4x4f,
//     view: mat4x4f,
//     projection: mat4x4f,
//     color: vec4f
// };

// @group(0) @binding(0)
// var<uniform> uniforms: Uniforms;
 
@vertex
fn main_vs(@location(0) pos: vec2f) -> @builtin(position) vec4f
{
    return vec4f(pos.x, pos.y, 0, 1.0);
}

@fragment
fn main_fs() -> @location(0) vec4f
{
    return vec4f(0.0, 0.0, 0.0, 1.0);
}