/**
 * Скрипт для генерации метаданных опций из TypeScript типов
 * Парсит src/core/types.ts и создаёт JSON файл для документации
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface NestedOption {
  name: string
  type: string
  default?: string
  description: string
}

interface Option {
  name: string
  type: string
  default: string
  description: string
  nested?: NestedOption[]
}

interface OptionsMeta {
  options: Option[]
}

/**
 * Парсит JSDoc комментарий и извлекает описание и default значение
 */
function parseJSDoc(comment: string): { description: string; default: string } {
  const lines = comment.split('\n').map(line => line.trim())
  
  let description = ''
  let defaultValue = 'undefined'
  
  for (const line of lines) {
    // Удаляем * в начале строки
    let cleanLine = line.replace(/^\*\s*/, '').replace(/^\*$/, '')
    
    if (cleanLine.startsWith('@default')) {
      defaultValue = cleanLine.replace('@default', '').trim()
    } else if (!cleanLine.startsWith('@') && !cleanLine.startsWith('/**') && !cleanLine.startsWith('*/') && cleanLine.length > 0) {
      if (description && cleanLine) {
        description += ' '
      }
      description += cleanLine
    }
  }
  
  // Очищаем описание от лишних символов
  description = description.trim().replace(/\s+\/$/, '').replace(/\/$/, '')
  
  return { description, default: defaultValue }
}

/**
 * Извлекает тип из строки определения свойства
 */
function extractType(line: string): string {
  const match = line.match(/:\s*([^;]+)/)
  if (match) {
    return match[1].trim()
  }
  return 'unknown'
}

/**
 * Извлекает имя свойства
 */
function extractPropertyName(line: string): string {
  const match = line.match(/^\s*(\w+)\??:/)
  if (match) {
    return match[1]
  }
  return ''
}

/**
 * Проверяет, является ли тип объектом с вложенными свойствами
 */
function isObjectType(type: string): boolean {
  return type.includes('{') || (type.includes('|') && type.includes('object'))
}

/**
 * Пропускает до строки с последней закрывающей скобкой типа (для union с несколькими объектами)
 */
function skipToEndOfType(lines: string[], startIndex: number): number {
  let depth = 0
  for (let idx = startIndex; idx < lines.length; idx++) {
    const line = lines[idx]
    const openBraces = (line.match(/\{/g) || []).length
    const closeBraces = (line.match(/\}/g) || []).length
    depth += openBraces - closeBraces
    if (depth === 0) {
      const nextLine = lines[idx + 1]?.trim() ?? ''
      if (nextLine.includes('|') && nextLine.includes('{')) continue
      return idx
    }
  }
  return startIndex
}

/**
 * Парсит вложенные свойства объекта
 */
function parseNestedProperties(lines: string[], startIndex: number): { nested: NestedOption[], endIndex: number } {
  const nested: NestedOption[] = []
  let depth = 0
  let currentComment = ''
  let i = startIndex
  
  for (; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()
    
    if (trimmedLine.includes('{')) depth++
    if (trimmedLine.includes('}')) {
      depth--
      if (depth === 0) break
    }
    
    // Собираем комментарии (включая однострочные)
    if (trimmedLine.startsWith('/**') || trimmedLine.startsWith('*') || trimmedLine.includes('/**')) {
      currentComment += trimmedLine + '\n'
      
      // Проверяем однострочный комментарий
      if (trimmedLine.includes('*/') && !trimmedLine.startsWith('*/')) {
        // Это однострочный JSDoc комментарий
      }
      continue
    }
    
    // Парсим свойство
    if (trimmedLine.match(/^\w+\??:/) && depth > 0) {
      const name = extractPropertyName(trimmedLine)
      const type = extractType(trimmedLine)
      
      if (name) {
        let description = ''
        let defaultValue: string | undefined = undefined
        
        if (currentComment) {
          const parsed = parseJSDoc(currentComment)
          description = parsed.description
          if (parsed.default !== 'undefined') {
            defaultValue = parsed.default
          }
        }
        
        nested.push({
          name,
          type,
          ...(defaultValue && { default: defaultValue }),
          description
        })
      }
      currentComment = ''
    }
  }
  
  return { nested, endIndex: i }
}

/**
 * Основная функция парсинга
 */
function parseTypesFile(filePath: string): OptionsMeta {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  
  const options: Option[] = []
  let currentComment = ''
  let insideInterface = false
  let interfaceDepth = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()
    
    // Определяем начало TvistOptions (открывающая скобка интерфейса на той же строке)
    if (trimmedLine.includes('export interface TvistOptions')) {
      insideInterface = true
      interfaceDepth = 1
      continue
    }
    
    if (!insideInterface) continue
    
    // Отслеживаем вложенность: считаем все { и } в строке (для многострочных типов вроде peek)
    const openBraces = (trimmedLine.match(/\{/g) || []).length
    const closeBraces = (trimmedLine.match(/\}/g) || []).length
    interfaceDepth += openBraces - closeBraces
    if (interfaceDepth === 0) break
    
    // Игнорируем комментарии-разделители
    if (trimmedLine.startsWith('//')) {
      continue
    }
    
    // Собираем JSDoc комментарии
    if (trimmedLine.startsWith('/**') || (currentComment && (trimmedLine.startsWith('*') || trimmedLine === '*/'))) {
      currentComment += trimmedLine + '\n'
      if (trimmedLine === '*/') {
        // Комментарий закончен, ждём определение свойства
      }
      continue
    }
    
    // Парсим свойство
    if (trimmedLine.match(/^\w+\??:/) && currentComment) {
      const name = extractPropertyName(trimmedLine)
      let type = extractType(trimmedLine)
      
      if (!name) {
        currentComment = ''
        continue
      }
      
      const { description, default: defaultValue } = parseJSDoc(currentComment)
      
      // Проверяем, есть ли вложенные свойства
      let nested: NestedOption[] | undefined
      
      if (type.includes('{')) {
        // Ищем начало объекта
        let objStart = i
        while (objStart < lines.length && !lines[objStart].includes('{')) {
          objStart++
        }
        
        const parseResult = parseNestedProperties(lines, objStart)
        nested = parseResult.nested.length > 0 ? parseResult.nested : undefined
        // Пропускаем до конца всего типа (для union с несколькими объектами, напр. peek)
        i = skipToEndOfType(lines, objStart)
        
        // Упрощаем тип для объектов
        if (type.includes('|')) {
          const parts = type.split('|').map(p => p.trim())
          type = parts.filter(p => p !== '{').join(' | ')
          if (type.endsWith('}')) {
            type = type.replace(/\{[\s\S]*\}/, 'object')
          }
        } else {
          type = 'object'
        }
        
        // Если есть boolean в union, добавляем его
        const originalType = extractType(trimmedLine)
        if (originalType.includes('boolean')) {
          type = 'boolean | ' + type
        }
      }
      
      options.push({
        name,
        type,
        default: defaultValue,
        description,
        ...(nested && { nested })
      })
      
      currentComment = ''
    }
  }
  
  return { options }
}

/**
 * Главная функция
 */
function main() {
  const typesPath = path.join(__dirname, '..', 'src', 'core', 'types.ts')
  const outputPath = path.join(__dirname, '..', 'docs', '.vitepress', 'options-meta.json')
  
  console.log('🔍 Парсинг типов из:', typesPath)
  
  const meta = parseTypesFile(typesPath)
  
  console.log(`✅ Найдено опций: ${meta.options.length}`)
  
  // Сохраняем с красивым форматированием
  fs.writeFileSync(outputPath, JSON.stringify(meta, null, 2), 'utf-8')
  
  console.log('💾 Метаданные сохранены в:', outputPath)
  console.log('✨ Готово!')
}

main()
