import { generateMipmap, numMipLevels } from "../../utility/genmipmap.js";
export class TexturesController {
    constructor({ device, pipeline, uniforms, imageUrl, cubeMapUrls }) {
        this.device = device;
        this.pipeline = pipeline;
        this.uniforms = uniforms;
        this.imageUrl = imageUrl;
        this.cubeMapUrls = cubeMapUrls;

        const panel = document.getElementById("textures");
        this.controls = panel?.querySelector("#texture-controls");
        if (!this.controls) {
            throw new Error("Texture controls are missing from the page.");
        }

        this.wrapModeControl = this.controls.querySelector("#wrap-mode");
        this.minFilterControl = this.controls.querySelector("#min-filter");
        this.magFilterControl = this.controls.querySelector("#mag-filter");
        this.mipmapFilterControl = this.controls.querySelector("#mipmap-filter");
        this.mipmapEnabledControl = this.controls.querySelector("#mipmap-enabled");
        this.texture = null;
        this.bindGroup = null;
    }

    async initializeCubeMap() {
        this.cubeMapImages = await Promise.all(this.cubeMapUrls.map(async (imageUrl) => {
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to load cube-map face: ${imageUrl}`);
            }
            const blob = await response.blob();
            return createImageBitmap(blob, { colorSpaceConversion: "none" });
        }));

        this.updateCubeMapSettings();
        this.controls.addEventListener("change", () => this.updateCubeMapSettings());
    }

    updateCubeMapSettings() {
        const mipmapEnabled = this.mipmapEnabledControl.checked;
        const { width, height } = this.cubeMapImages[0];
        const nextTexture = this.device.createTexture({
            size: [width, height, 6],
            format: "rgba8unorm",
            mipLevelCount: mipmapEnabled ? numMipLevels(width, height) : 1,
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
        });

        for (let i = 0; i < this.cubeMapImages.length; ++i) {
            this.device.queue.copyExternalImageToTexture(
                { source: this.cubeMapImages[i] },
                { texture: nextTexture, origin: [0, 0, i] },
                { width, height }
            );
        }

        if (mipmapEnabled) {
            generateMipmap(this.device, nextTexture);
        }

        const sampler = this.device.createSampler({
            addressModeU: this.wrapModeControl.value,
            addressModeV: this.wrapModeControl.value,
            minFilter: this.minFilterControl.value,
            magFilter: this.magFilterControl.value,
            mipmapFilter: this.mipmapFilterControl.value,
        });

        const nextBindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: this.uniforms.buffer },
                { binding: 1, resource: sampler },
                { binding: 2, resource: nextTexture.createView({ dimension: "cube", arrayLayerCount: 6 }) },
            ],
        });

        this.texture?.destroy();
        this.texture = nextTexture;
        this.bindGroup = nextBindGroup;

    }

    async initialize() {
        if (this.cubeMapUrls) {
            await this.initializeCubeMap();
            return;
        }

        const response = await fetch(this.imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to load texture: ${this.imageUrl}`);
        }

        const blob = await response.blob();
        this.image = await createImageBitmap(blob, { colorSpaceConversion: "none" });
        this.updateTextureSettings();
        this.controls.addEventListener("change", () => this.updateTextureSettings());
    }



    updateTextureSettings() {
        const mipmapEnabled = this.mipmapEnabledControl.checked;
        const nextTexture = this.device.createTexture({
            size: [this.image.width, this.image.height, 1],
            format: "rgba8unorm",
            mipLevelCount: mipmapEnabled
                ? numMipLevels(this.image.width, this.image.height)
                : 1,
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
        });
        this.device.queue.copyExternalImageToTexture(
            { source: this.image, flipY: true },
            { texture: nextTexture },
            { width: this.image.width, height: this.image.height },
        );

        if (mipmapEnabled) {
            generateMipmap(this.device, nextTexture);
        }

        const sampler = this.device.createSampler({
            addressModeU: this.wrapModeControl.value,
            addressModeV: this.wrapModeControl.value,
            minFilter: this.minFilterControl.value,
            magFilter: this.magFilterControl.value,
            mipmapFilter: this.mipmapFilterControl.value,
        });
        const nextBindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: this.uniforms.buffer },
                { binding: 1, resource: sampler },
                { binding: 2, resource: nextTexture.createView() },
            ],
        });

        this.texture?.destroy();
        this.texture = nextTexture;
        this.bindGroup = nextBindGroup;
    }
}
