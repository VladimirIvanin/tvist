// https://vitepress.dev/guide/custom-theme
import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './style.css'
import ExampleCard from './ExampleCard.vue'
import OptionsTable from './OptionsTable.vue'

// Peek examples
import PeekBasicExample from './examples/PeekBasicExample.vue'
import PeekPercentExample from './examples/PeekPercentExample.vue'
import PeekAsymmetricExample from './examples/PeekAsymmetricExample.vue'
import PeekPerPageExample from './examples/PeekPerPageExample.vue'
import PeekVerticalExample from './examples/PeekVerticalExample.vue'
import PeekBreakpointsExample from './examples/PeekBreakpointsExample.vue'
import PeekMixedUnitsExample from './examples/PeekMixedUnitsExample.vue'
import PeekTrimExample from './examples/PeekTrimExample.vue'

// Center examples
import CenterBasicExample from './examples/CenterBasicExample.vue'
import CenterPerPage2Example from './examples/CenterPerPage2Example.vue'
import CenterPerPage4Example from './examples/CenterPerPage4Example.vue'
import CenterLoopExample from './examples/CenterLoopExample.vue'

// Grid examples
import GridExample from './examples/GridExample.vue'
import GridDimensionsExample from './examples/GridDimensionsExample.vue'

// Update Options example
import UpdateOptionsExample from './examples/UpdateOptionsExample.vue'

// Scroll Control (for doc page)
import ScrollControlDocExample from './examples/ScrollControlDocExample.vue'

// Marquee examples
import MarqueeExample from './examples/MarqueeExample.vue'
import MarqueeDocExample from './examples/MarqueeDocExample.vue'

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
    
    // Peek examples
    app.component('PeekBasicExample', PeekBasicExample)
    app.component('PeekPercentExample', PeekPercentExample)
    app.component('PeekAsymmetricExample', PeekAsymmetricExample)
    app.component('PeekPerPageExample', PeekPerPageExample)
    app.component('PeekVerticalExample', PeekVerticalExample)
    app.component('PeekBreakpointsExample', PeekBreakpointsExample)
    app.component('PeekMixedUnitsExample', PeekMixedUnitsExample)
    app.component('PeekTrimExample', PeekTrimExample)
    
    // Center examples
    app.component('CenterBasicExample', CenterBasicExample)
    app.component('CenterPerPage2Example', CenterPerPage2Example)
    app.component('CenterPerPage4Example', CenterPerPage4Example)
    app.component('CenterLoopExample', CenterLoopExample)

    // Grid examples
    app.component('GridExample', GridExample)
    app.component('GridDimensionsExample', GridDimensionsExample)

    // Update Options example
    app.component('UpdateOptionsExample', UpdateOptionsExample)

    app.component('ScrollControlDocExample', ScrollControlDocExample)
    
    // Marquee examples
    app.component('MarqueeExample', MarqueeExample)
    app.component('MarqueeDocExample', MarqueeDocExample)
  }
} satisfies Theme
