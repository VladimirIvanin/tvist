/**
 * Глобальный реестр модулей Tvist.
 * Отдельный файл нужен чтобы опциональные модули могли регистрироваться
 * без импорта всего Tvist.ts (что тянет Engine и весь граф зависимостей).
 */

import type { ModuleConstructor } from '../modules/Module'

export const TVIST_MODULE_REGISTRY = new Map<string, ModuleConstructor>()
