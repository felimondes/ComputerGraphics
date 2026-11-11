### (1)

In parts 1 and 2 the vertex shader transforms a vertex call it p_model using the following transformation:

$$
p_{clip} = P V M p_{model}
$$

where M is model matrix, V is the view matrix and the P is the projection matrix (P).

The model matrix takes a object in from its own local coordinate system (called model space) and puts it into the world coordinates.
In the exercises we only move and rotate the cubes, but you can also scale it up.

$$
M = T R_z R_y R_x
$$

$$
T(t_x,t_y,t_z)=
\begin{bmatrix}
1&0&0&t_x\\
0&1&0&t_y\\
0&0&1&t_z\\
0&0&0&1
\end{bmatrix}
$$

$$
R_x(\theta)=
\begin{bmatrix}
1&0&0&0\\
0&\cos\theta&\sin\theta&0\\
0&-\sin\theta&\cos\theta&0\\
0&0&0&1
\end{bmatrix}
$$

$$
R_y(\theta)=
\begin{bmatrix}
\cos\theta&0&-\sin\theta&0\\
0&1&0&0\\
\sin\theta&0&\cos\theta&0\\
0&0&0&1
\end{bmatrix}
$$

$$
R_z(\theta)=
\begin{bmatrix}
\cos\theta&\sin\theta&0&0\\
-\sin\theta&\cos\theta&0&0\\
0&0&1&0\\
0&0&0&1
\end{bmatrix}
$$

### View Matrix

The view matrix transforms objects from world coordinates into camera coordinates. It is generated using the *lookAt* function, which takes three vectors as input:

$$
V = \operatorname{lookAt}(eye, at, up)
$$


Here, *eye* represents the camera position, *at* represents the point the camera is looking at, and *up* defines the camera's upward direction.

These three vectors define the camera's position and orientation in the world.

### Orthographic Projection

Part 1 uses orthographic projection:

$$
P_{ortho}=
\begin{bmatrix}
\frac{2}{r-l}&0&0&-\frac{l+r}{r-l}\\
0&\frac{2}{t-b}&0&-\frac{t+b}{t-b}\\
0&0&-\frac{2}{f-n}&-\frac{n+f}{f-n}\\
0&0&0&1
\end{bmatrix}
$$

### Perspective Projection

Part 2 uses:

$$
P_{\text{perspective}}=
\begin{bmatrix}
\frac{\cot(\alpha/2)}{A} & 0 & 0 & 0\\
0 & \cot(\alpha/2) & 0 & 0\\
0 & 0 & -\frac{n+f}{f-n} & -\frac{2nf}{f-n}\\
0 & 0 & -1 & 0
\end{bmatrix}
$$

Both matrices project the view from the camera onto a 2D plane. Orthographic projection preserves the apparent size of objects regardless of their distance from the camera, whereas perspective projection makes objects appear smaller as their distance from the camera increases.

## (2)

### Part 1 Cube

Part 1 renders one cube with an orthographic projection.

$$
p_{clip} = P_{ortho} V T_1 R_{z1} R_{y1} R_{x1} p_{model}
$$

### Part 2 Cube 1: One-Point Perspective

Cube 1 has no rotation, therefore:

$$
M = T
$$

The transformation is:

$$
p_{clip} = P_{perspective} V T p_{model}
$$

### Part 2 Cube 2: Two-Point Perspective

Cube 2 is rotated around the Y axis.

Its model matrix is:

$$
M = T R_z(0) R_y(\theta_y) R_x(0)
$$

Since rotations by zero degrees are identity matrices:

$$
M = T R_y(\theta_y)
$$

The transformation is:

$$
p_{clip} = P_{perspective} V T R_y(\theta_y) p_{model}
$$

### Part 2 Cube 3: Three-Point Perspective

Cube 3 is rotated around both the X and Y axes:

Similarly to before the complete transformation becomes:

$$
p_{clip} = P_{perspective} V T_3 R_y(\theta_y) R_x(\theta_x) p_{model}
$$
