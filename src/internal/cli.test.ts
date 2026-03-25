import { describe, expect, it } from 'vite-plus/test'

import { parseTokenOutput } from './cli'

describe('parseTokenOutput', () => {
  it('valid token -> returns value', () => {
    const output = JSON.stringify({ token: 'abc123' })

    expect(parseTokenOutput(output)).toBe('abc123')
  })

  it('missing token -> null', () => {
    expect(parseTokenOutput('{}')).toBeNull()
  })

  it('empty token -> null', () => {
    const output = JSON.stringify({ token: '' })

    expect(parseTokenOutput(output)).toBeNull()
  })

  it('token not string -> null', () => {
    const output = JSON.stringify({ token: 123 })

    expect(parseTokenOutput(output)).toBeNull()
  })

  it('invalid JSON -> null', () => {
    expect(parseTokenOutput('not json')).toBeNull()
  })

  it('json null -> null', () => {
    expect(parseTokenOutput('null')).toBeNull()
  })

  it('json array -> null', () => {
    expect(parseTokenOutput('[1, 2]')).toBeNull()
  })
})
