import { defineConfig } from 'vitepress'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  title: "Tvist",
  description: "Модульный и легковесный слайдер для современного веба",
  lang: 'ru-RU',
  base: '/tvist/',
  
  vite: {
    resolve: {
      dedupe: ['vue'],
      alias: {
        '@': resolve(__dirname, '../../src'),
        '@core': resolve(__dirname, '../../src/core'),
        '@modules': resolve(__dirname, '../../src/modules'),
        '@utils': resolve(__dirname, '../../src/utils'),
        'tvist': resolve(__dirname, '../../src/index.ts'),
      }
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
        text: 'API',
        items: [
          { text: 'Обзор API', link: '/api/' },
          { text: 'Опции', link: '/api/options' },
          { text: 'Методы', link: '/api/methods' },
          { text: 'Свойства', link: '/api/properties' },
          { text: 'События', link: '/api/events' },
          { text: 'Статические методы', link: '/api/static' },
          { text: 'Модули', link: '/api/modules' },
          { text: 'TypeScript', link: '/api/typescript' }
        ]
      },
      {
        text: 'Примеры',
        items: [
          { text: 'Все примеры', link: '/examples-list' },
          { text: 'Базовый', link: '/examples/basic' },
          { text: 'PerPage', link: '/examples/perpage' },
          { text: 'Peek', link: '/examples/peek' },
          { text: 'Center', link: '/examples/center' },
          { text: 'Responsive', link: '/examples/responsive' },
          { text: 'Update Options', link: '/examples/update-options' },
          { text: 'Loop', link: '/examples/loop' },
          { text: 'Fade Effect', link: '/examples/effect-fade' },
          { text: 'Cube Effect', link: '/examples/effect-cube' },
          { text: 'Vertical', link: '/examples/vertical' },
          { text: 'Modules', link: '/examples/modules' },
          { text: 'Thumbs', link: '/examples/thumbs' },
          { text: 'Grid', link: '/examples/grid' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/VladimirIvanin/tvist' }
    ]
  }
})
