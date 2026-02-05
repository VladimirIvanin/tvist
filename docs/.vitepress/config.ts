import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Tvist",
  description: "Модульный и легковесный слайдер для современного веба",
  lang: 'ru-RU',
  base: '/tvist/',
  outDir: '../docs-dist',
  
  vite: {
    resolve: {
      dedupe: ['vue']
    },
    server: {
      fs: {
        strict: false
      }
    }
  },

  themeConfig: {
    nav: [
      { text: 'Главная', link: '/' },
      { text: 'Примеры', link: '/examples-list' },
      { text: 'API', link: '/api/' }
    ],

    sidebar: [
      {
        text: 'Документация',
        items: [
          { text: 'Введение', link: '/guide/' },
          { text: 'Установка', link: '/guide/installation' },
          { text: 'Быстрый старт', link: '/guide/getting-started' }
        ]
      },
      {
        text: 'Примеры',
        link: '/examples-list'
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/VladimirIvanin/tvist' }
    ]
  }
})
