/**
 * Утилиты для нативного loading="lazy" в слайдах (cube, fade и т.д.).
 */

import type { TvistOptions } from '../core/types'

/**
 * Принудительно запускает загрузку: переводит img с loading="lazy" в eager внутри root.
 */
export function forceEagerLoadingForLazyImages(root: HTMLElement): void {
  root.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((img) => {
    img.loading = 'eager'
  })
}

/**
 * Разбор опции nativeLazyAdjacent. null — функция выключена.
 */
export function resolveNativeLazyAdjacentConfig(
  value: TvistOptions['nativeLazyAdjacent']
): { onInit: boolean; onTransitionStart: boolean } | null {
  if (value === false || value === undefined || value === null) {
    return null
  }
  if (value === true) {
    return { onInit: false, onTransitionStart: true }
  }

  return {
    onInit: value.onInit === true,
    onTransitionStart: value.onTransitionStart !== false,
  }
}
