// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  vite: {
    optimizeDeps: {
      include: ['three'],
    },
  },
  app: {
    head: {
      title: 'VOIDSTRIKE: STARFALL',
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        {
          name: 'description',
          content:
            'VOIDSTRIKE: STARFALL — 3D side-scrolling arcade shooter. Single-player, no login.',
        },
      ],
    },
  },
})
