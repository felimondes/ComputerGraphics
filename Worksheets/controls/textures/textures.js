import { generateMipmap, numMipLevels } from "../../utility/genmipmap.js";
export class TexturesController {
    constructor({
        device,
        pipeline,
        uniforms,
        imageUrl,
        cubeMapUrls,
        bindGroupIndex = 0,
        textureOnly = false
    }) {
        this.device = device;
        this.pipeline = pipeline;
        this.uniforms = uniforms;
        this.imageUrl = imageUrl;
        this.cubeMapUrls = cubeMapUrls;
        this.bindGroupIndex = bindGroupIndex;
        this.textureOnly = textureOnly;

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
        this.uniformBuffers = new Set(
            textureOnly ? [null] : uniforms ? [uniforms.buffer] : []
        );
        this.bindGroups = new Map();
        this.sampler = null;
    }

    registerUniformBuffer(uniformBuffer) {
        this.uniformBuffers.add(uniformBuffer);
        if (this.texture && this.sampler) {
            this.updateBindGroups(this.texture, this.sampler);
        }
        return this.bindGroups.get(uniformBuffer);
    }

    getBindGroup(uniformBuffer = this.uniforms ? this.uniforms.buffer : null) {
        const bindGroup = this.bindGroups.get(uniformBuffer);
        if (!bindGroup) {
            throw new Error("No texture bind group exists for the requested uniform buffer.");
        }
        return bindGroup;
    }

    updateBindGroups(texture, sampler) {
        this.bindGroups.clear();
        for (const uniformBuffer of this.uniformBuffers) {
            const textureView = this.cubeMapUrls
                ? texture.createView({ dimension: "cube", arrayLayerCount: 6 })
                : texture.createView();
            const entries = this.textureOnly
                ? [
                    { binding: 0, resource: sampler },
                    { binding: 1, resource: textureView },
                ]
                : [
                    { binding: 0, resource: uniformBuffer },
                    { binding: 1, resource: sampler },
                    { binding: 2, resource: textureView },
                ];
            const bindGroup = this.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(this.bindGroupIndex),
                entries,
            });
            this.bindGroups.set(uniformBuffer, bindGroup);
        }
        this.bindGroup = this.textureOnly
            ? this.bindGroups.get(null)
            : this.uniforms
                ? this.bindGroups.get(this.uniforms.buffer)
                : null;
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
                { source: this.cubeMapImages[i], flipY: true },
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

        this.updateBindGroups(nextTexture, sampler);
        this.texture?.destroy();
        this.texture = nextTexture;
        this.sampler = sampler;

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
        this.updateBindGroups(nextTexture, sampler);
        this.texture?.destroy();
        this.texture = nextTexture;
        this.sampler = sampler;
    }
}
