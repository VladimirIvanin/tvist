/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest'
import {
  forceEagerLoadingForLazyImages,
  resolveNativeLazyAdjacentConfig,
} from '@utils/nativeLazyImages'

describe('forceEagerLoadingForLazyImages', () => {
  it('меняет loading с lazy на eager у всех подходящих img', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <img id="a" src="/a.jpg" loading="lazy" />
      <span><img id="b" src="/b.jpg" loading="lazy" /></span>
      <img id="c" src="/c.jpg" loading="eager" />
    `
    forceEagerLoadingForLazyImages(root)

    expect(root.querySelector('#a')).toBeInstanceOf(HTMLImageElement)
    const a = root.querySelector('#a') as HTMLImageElement
    const b = root.querySelector('#b') as HTMLImageElement
    const c = root.querySelector('#c') as HTMLImageElement
    expect(a.loading).toBe('eager')
    expect(b.loading).toBe('eager')
    expect(c.loading).toBe('eager')
  })

  it('не падает на пустом контейнере', () => {
    const root = document.createElement('div')
    expect(() => forceEagerLoadingForLazyImages(root)).not.toThrow()
  })
})

describe('resolveNativeLazyAdjacentConfig', () => {
  it('возвращает null если выключено', () => {
    expect(resolveNativeLazyAdjacentConfig(undefined)).toBeNull()
    expect(resolveNativeLazyAdjacentConfig(false)).toBeNull()
  })

  it('для true: onTransitionStart по умолчанию, onInit выключен', () => {
    expect(resolveNativeLazyAdjacentConfig(true)).toEqual({
      onInit: false,
      onTransitionStart: true,
    })
  })

  it('для {}: только onTransitionStart', () => {
    expect(resolveNativeLazyAdjacentConfig({})).toEqual({
      onInit: false,
      onTransitionStart: true,
    })
  })

  it('явный onInit: true добавляет предзагрузку при init', () => {
    expect(resolveNativeLazyAdjacentConfig({ onInit: true })).toEqual({
      onInit: true,
      onTransitionStart: true,
    })
  })

  it('позволяет отключить onTransitionStart', () => {
    expect(
      resolveNativeLazyAdjacentConfig({ onTransitionStart: false })
    ).toEqual({
      onInit: false,
      onTransitionStart: false,
    })
  })

  it('позволяет только onInit без перехода', () => {
    expect(
      resolveNativeLazyAdjacentConfig({
        onInit: true,
        onTransitionStart: false,
      })
    ).toEqual({
      onInit: true,
      onTransitionStart: false,
    })
  })

  it('позволяет отключить оба триггера (пустая работа)', () => {
    expect(
      resolveNativeLazyAdjacentConfig({
        onInit: false,
        onTransitionStart: false,
      })
    ).toEqual({
      onInit: false,
      onTransitionStart: false,
    })
  })
})
