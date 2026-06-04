import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'),
) as { version: string }

/** Текущая версия пакета из корневого package.json */
export const version = pkg.version

/** Тег релиза для CDN (v1.19.2) */
export const versionTag = `v${version}`
