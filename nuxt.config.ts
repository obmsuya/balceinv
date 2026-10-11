import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: false,
  css: ["./app/assets/css/main.css"],

  app: {
    head: {
      link: [
        { rel: "icon", type: "image/png", sizes: "32x32", href: "/faltasi-favicon-32.png" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/faltasi-apple-touch-icon.png" },
      ],
      meta: [
        { name: "description", content: "Faltasi POS: sales, stock, customers and books for shops in Tanzania." },
        { name: "author", content: "Faltasi" },
        { name: "theme-color", content: "#00113A" },
        { name: "application-name", content: "Faltasi POS" },
        { property: "og:site_name", content: "Faltasi POS" },
        { property: "og:title", content: "Faltasi POS" },
        { property: "og:description", content: "Sales, stock, customers and books for shops in Tanzania." },
        { property: "og:image", content: "https://pos.faltasi.com/faltasi-icon.png" },
        { name: "twitter:card", content: "summary" },
      ],
    },
  },

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
