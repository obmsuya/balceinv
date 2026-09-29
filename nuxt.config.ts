import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: false,
  css: ["./app/assets/css/main.css"],

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || process.env.API_BASE_URL || "",
    },
  },

  vite: {
    plugins: [tailwindcss() as any],
    optimizeDeps: {
      include: ["vue", "vue-router"],
    },
  },

  modules: ["shadcn-nuxt", "@nuxtjs/color-mode"],

  typescript: {
    strict: false,
    typeCheck: false,
  },
});
