struct Uniforms {
    model: mat4x4f,
    view: mat4x4f,
    projection: mat4x4f,
    color: vec4f
};

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;
 
@vertex
fn main_vs(@location(0) pos: vec3f) -> @builtin(position) vec4f
{
    return uniforms.projection
     * uniforms.view
     * uniforms.model
     * vec4f(pos.x, pos.y, pos.z, 1.0);
}

@fragment
fn main_fs() -> @location(0) vec4f
{
    return uniforms.color;
}