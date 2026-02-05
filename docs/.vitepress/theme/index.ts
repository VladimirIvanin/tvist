// https://vitepress.dev/guide/custom-theme
import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './style.css'
import ExampleCard from './ExampleCard.vue'
import OptionsTable from './OptionsTable.vue'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
    })
  },
  enhanceApp({ app, router, siteData }) {
    // Регистрируем глобальные компоненты
    app.component('ExampleCard', ExampleCard)
    app.component('OptionsTable', OptionsTable)
  }
} satisfies Theme
