

The minification and magnification filters determine how the coloring of the pixels are done. A sample in the texture might land between 4 texture centers with different colors. If you chose "Nearest", then the nearest center determines the color. If you chose "Linear", then a linear then the sample is a mix of the 4 centers; done using linear interpolation betweeen them.

The mipmap filter determines which mipmap level to sample; Say one screen pixel covers 1 texel, then you use the full resolution map. But during minification i can be smart to select a lower resolution map. For example if one screen pixel an area of 4x4 texels, then use the 4x4 texel map. 

If you chose "Nearest", then the closest mipmap to the coverage is chosen. If you chose "Linear" a linear interpolation between the two nearest mipmaps is done.
