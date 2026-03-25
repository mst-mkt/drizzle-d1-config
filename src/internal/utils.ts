import fs from 'node:fs'

export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export const fileExists = (filePath: string) => {
  return fs.existsSync(filePath)
}

export const readFile = (filePath: string) => {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
}
