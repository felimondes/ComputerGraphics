### a) Flat, Gouraud, and Phong shading

**Flat shading** is when the geometrical/face normal is used in the lighting calculations. It becomes the same color for the entire surface. 

**Gouraud shading** uses the vertex normal in the lightning calculations, and then let the fragment shader interpolate the colors.

**Phong shading** sends the vertex normal and world position to the fragment shader, which results in interpolating them s.t. that the interpolated versions for each pixel is avaliable in the fragment shader. Then the lighting model can be evaluated for each pixel.

To implement flat shading I would calculate the face normal on the CPU side and add it to the vertex input. Then like in Phong shading pass it further to the fragment shader along with world position, and then evaluate the lighting model in each pixel using the face normal.
Since the face normal is the same for each point in the triangle, the interpolation will also be the same in the fragment shader.

### b) Directional light and point light

A directional light is just a direction vector (w=0), and is therefore treated as infinitely far away, thus its intensity does not vary with position.
A point light is a position vector (w=1), so its direction in relation to it changes the lighting on the surface, and its intensity decreases with distance.

### c) Does eye position influence shading?

No, it does not. However, it does in the lighting model! In Phong reflection moving the eye moves the highlight.

### d) Specular term set to (0, 0, 0)

The material has no specular reflection, so highlights disappear. The object only has diffuse and ambient lighting, giving it a matte look.

### e) Increasing the shininess exponent alpha

Increasing alpha makes the specular highlight tighter and sharper. Decreasing it makes the highlight broader and less concentrated.

### f) Lighting coordinate space

In world space.
