import { Tvist } from '../../core/Tvist'
import { GridModule } from './GridModule'

// Автоматическая регистрация модуля
Tvist.MODULES.set('grid', GridModule)

export { GridModule }
