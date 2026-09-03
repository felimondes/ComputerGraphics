struct vsout {
    @builtin(position)
    position: vec4f,
    @location(0)
    colorr:    vec3f,
}

@vertex
fn main_vs(@location(0) pos: vec2f, @location(1) inColor: vec3f) -> vsout {
        var vsout: vsout;
        vsout.position = vec4f(pos, 0.0, 1.0);
        vsout.colorr = inColor;
    return vsout;
}

//colors pixel
@fragment
fn main_fs(@location(0) inColor: vec3f) -> @location(0) vec4f {
    return vec4f(inColor, 1.0);
}