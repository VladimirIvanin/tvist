interface NumberControlOptions {
  id: string
  label: string
  value: unknown
  attributes?: Record<string, string>
  step?: number
  min?: number
  max?: number
  defaultValue?: number
}

function escape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function parseNumber(raw: string): number | undefined {
  const value = raw.trim().replace(',', '.')
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

export function numberControl(options: NumberControlOptions): string {
  const { id, label, value, attributes = {}, step = 1, min, max, defaultValue } = options
  const raw = value === undefined ? '' : String(value)
  const current = parseNumber(raw) ?? defaultValue ?? min ?? 0
  const extra = Object.entries(attributes).map(([name, content]) => ` ${name}="${escape(content)}"`).join('')
  return `<div class="builder-number" data-number-control data-step="${step}"${defaultValue === undefined ? '' : ` data-default="${defaultValue}"`}>
    <button type="button" data-number-step="-1" aria-label="${escape(label)}: уменьшить"${min !== undefined && current <= min ? ' disabled' : ''}>−</button>
    <input id="${escape(id)}" type="text" inputmode="decimal" role="spinbutton" autocomplete="off" aria-label="${escape(label)}"${min === undefined ? '' : ` aria-valuemin="${min}"`}${max === undefined ? '' : ` aria-valuemax="${max}"`}${raw ? ` aria-valuenow="${current}"` : ''} value="${escape(raw)}" data-number-committed="${escape(raw)}" placeholder="${defaultValue === undefined ? 'По умолчанию' : defaultValue}"${extra}>
    <button type="button" data-number-step="1" aria-label="${escape(label)}: увеличить"${max !== undefined && current >= max ? ' disabled' : ''}>+</button>
  </div>`
}

/** Делегирование сохраняет работу контролов после перерисовки формы. */
export function mountNumberControls(root: HTMLElement): void {
  const clamp = (input: HTMLInputElement, value: number) => Math.min(
    Number(input.getAttribute('aria-valuemax') ?? Infinity),
    Math.max(Number(input.getAttribute('aria-valuemin') ?? -Infinity), value),
  )
  const sync = (input: HTMLInputElement) => {
    const control = input.closest<HTMLElement>('[data-number-control]')!
    const value = parseNumber(input.value)
    if (value === undefined) input.removeAttribute('aria-valuenow')
    else input.setAttribute('aria-valuenow', String(value))
    const current = value ?? Number(control.dataset.default ?? input.getAttribute('aria-valuemin') ?? 0)
    control.querySelector<HTMLButtonElement>('[data-number-step="-1"]')!.disabled = current <= Number(input.getAttribute('aria-valuemin') ?? -Infinity)
    control.querySelector<HTMLButtonElement>('[data-number-step="1"]')!.disabled = current >= Number(input.getAttribute('aria-valuemax') ?? Infinity)
  }
  const commit = (input: HTMLInputElement) => {
    const id = input.id
    const active = document.activeElement
    const direction = active instanceof HTMLElement ? active.dataset.numberStep : undefined
    input.dispatchEvent(new Event('change', { bubbles: true }))
    // Брейкпоинты перерисовываются при изменении: возвращаем фокус в тот же контрол.
    if (!input.isConnected && (active === input || direction)) {
      const replacement = document.getElementById(id)
      const target = direction
        ? replacement?.closest('[data-number-control]')?.querySelector<HTMLButtonElement>(`[data-number-step="${direction}"]`)
        : replacement
      if (target instanceof HTMLElement) target.focus({ preventScroll: true })
    }
  }
  const changeBy = (input: HTMLInputElement, direction: number) => {
    const control = input.closest<HTMLElement>('[data-number-control]')!
    const base = parseNumber(input.value) ?? Number(control.dataset.default ?? input.getAttribute('aria-valuemin') ?? 0)
    input.value = String(clamp(input, Number((base + direction * Number(control.dataset.step)).toFixed(10))))
    commit(input)
  }

  // Нормализуем текст до обработчиков формы, чтобы в настройки попадали только числа.
  root.addEventListener('change', (event) => {
    const input = event.target
    if (!(input instanceof HTMLInputElement) || !input.closest('[data-number-control]')) return
    const parsed = parseNumber(input.value)
    if (input.value.trim() && parsed === undefined) {
      input.value = input.dataset.numberCommitted ?? ''
      sync(input)
      event.stopImmediatePropagation()
      return
    }
    input.value = parsed === undefined ? '' : String(clamp(input, parsed))
    sync(input)
    if (input.value === input.dataset.numberCommitted) event.stopImmediatePropagation()
    else input.dataset.numberCommitted = input.value
  }, true)

  root.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-number-step]') : null
    if (!button || button.disabled) return
    const input = button.closest('[data-number-control]')!.querySelector('input')!
    changeBy(input, Number(button.dataset.numberStep))
  })
  root.addEventListener('pointerdown', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-number-step]') : null
    if (document.activeElement instanceof HTMLInputElement && button?.closest('[data-number-control]')?.contains(document.activeElement)) event.preventDefault()
  })
  root.addEventListener('input', (event) => {
    const input = event.target
    if (input instanceof HTMLInputElement && input.closest('[data-number-control]')) sync(input)
  })
  root.addEventListener('keydown', (event) => {
    const input = event.target
    if (!(input instanceof HTMLInputElement) || !input.closest('[data-number-control]')) return
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      changeBy(input, (event.key === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? 10 : 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      commit(input)
    } else if (event.key === 'Escape') {
      input.value = input.dataset.numberCommitted ?? ''
      sync(input)
    }
  })
}
