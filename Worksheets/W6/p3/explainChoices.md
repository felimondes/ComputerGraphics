
* **Mipmaps are essential** for minification—they provide pre-filtered lower resolutions, eliminating aliasing and shimmering during rotation
* **Linear minification** ensures smooth color transitions within each mipmap level, preserving texture detail
* **Nearest mipmap filter** avoids over-blurring by selecting the closest level crisply (or use `linear` for even smoother transitions at a cost)
