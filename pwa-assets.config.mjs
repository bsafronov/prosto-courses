import {
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

export default defineConfig({
  headLinkOptions: {
    preset: "2023",
  },
  images: ["public/favicon.svg"],
  preset: {
    ...minimal2023Preset,
    transparent: {
      ...minimal2023Preset.transparent,
      padding: 0,
    },
    maskable: {
      ...minimal2023Preset.maskable,
      padding: 0.2,
      resizeOptions: {
        ...minimal2023Preset.maskable.resizeOptions,
        background: "#3347a8",
      },
    },
    apple: {
      ...minimal2023Preset.apple,
      padding: 0,
      resizeOptions: {
        ...minimal2023Preset.apple.resizeOptions,
        background: "#3347a8",
      },
    },
  },
});
