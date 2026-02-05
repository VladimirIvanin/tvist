import { Tvist } from '../../core/Tvist'
import { ThumbsModule } from './ThumbsModule'

// Автоматическая регистрация модуля
Tvist.registerModule('thumbs', ThumbsModule)

export { ThumbsModule }
