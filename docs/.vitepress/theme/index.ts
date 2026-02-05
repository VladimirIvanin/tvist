// https://vitepress.dev/guide/custom-theme
import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './style.css'
import ExampleCard from './ExampleCard.vue'
import OptionsTable from './OptionsTable.vue'

// Padding examples
import PaddingBasicExample from './examples/PaddingBasicExample.vue'
import PaddingPercentExample from './examples/PaddingPercentExample.vue'
import PaddingAsymmetricExample from './examples/PaddingAsymmetricExample.vue'
import PaddingPerPageExample from './examples/PaddingPerPageExample.vue'
import PaddingVerticalExample from './examples/PaddingVerticalExample.vue'
import PaddingBreakpointsExample from './examples/PaddingBreakpointsExample.vue'
import PaddingMixedUnitsExample from './examples/PaddingMixedUnitsExample.vue'

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
    
    // Padding examples
    app.component('PaddingBasicExample', PaddingBasicExample)
    app.component('PaddingPercentExample', PaddingPercentExample)
    app.component('PaddingAsymmetricExample', PaddingAsymmetricExample)
    app.component('PaddingPerPageExample', PaddingPerPageExample)
    app.component('PaddingVerticalExample', PaddingVerticalExample)
    app.component('PaddingBreakpointsExample', PaddingBreakpointsExample)
    app.component('PaddingMixedUnitsExample', PaddingMixedUnitsExample)
  }
} satisfies Theme
