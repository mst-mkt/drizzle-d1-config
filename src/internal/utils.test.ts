import { describe, expect, it } from 'vite-plus/test'

import { isRecord } from './utils'

describe('isRecord', () => {
  it('object -> true', () => {
    expect(isRecord({ a: 1 })).toBe(true)
  })

  it('empty object -> true', () => {
    expect(isRecord({})).toBe(true)
  })

  it('null -> false', () => {
    expect(isRecord(null)).toBe(false)
  })

  it('array -> false', () => {
    expect(isRecord([1, 2])).toBe(false)
  })

  it('empty array -> false', () => {
    expect(isRecord([])).toBe(false)
  })

  it('string -> false', () => {
    expect(isRecord('hello')).toBe(false)
  })

  it('number -> false', () => {
    expect(isRecord(42)).toBe(false)
  })

  it('undefined -> false', () => {
    expect(isRecord(undefined)).toBe(false)
  })

  it('boolean -> false', () => {
    expect(isRecord(true)).toBe(false)
  })
})
