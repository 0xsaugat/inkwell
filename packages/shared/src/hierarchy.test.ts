import { describe, expect, it } from 'vitest'
import {
  createPageInputSchema,
  iconSchema,
  movePageInputSchema,
  positionAfter,
  positionForIndex,
  sectionColorSchema,
  updatePageInputSchema,
} from './hierarchy'

describe('hierarchy schemas', () => {
  it('defaults optional page fields', () => {
    const parsed = createPageInputSchema.parse({
      sectionId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    })

    expect(parsed).toEqual({
      sectionId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      title: 'Untitled',
      parentPageId: null,
      type: 'flow',
    })
  })

  it('rejects invalid ids, colors, and oversized icons', () => {
    expect(() => createPageInputSchema.parse({ sectionId: 'not-a-uuid' })).toThrow()
    expect(() => sectionColorSchema.parse('blue')).toThrow()
    expect(() => iconSchema.parse('x'.repeat(17))).toThrow()
  })

  it('requires a full update payload', () => {
    expect(() => updatePageInputSchema.parse({ title: 'Notes' })).toThrow()
    expect(
      updatePageInputSchema.parse({ title: 'Notes', icon: null, cover: 'moss' }),
    ).toEqual({ title: 'Notes', icon: null, cover: 'moss' })
  })

  it('defaults move targets to the section root', () => {
    expect(
      movePageInputSchema.parse({ sectionId: '3fa85f64-5717-4562-b3fc-2c963f66afa6' }),
    ).toEqual({
      sectionId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      parentPageId: null,
      beforePageId: null,
    })
  })
})

describe('position helpers', () => {
  it('builds fixed-width sortable keys', () => {
    expect(positionForIndex(0)).toBe('00000000')
    expect(positionForIndex(42)).toBe('00000042')
    expect('00000009' < '00000010').toBe(true)
  })

  it('appends after the last position', () => {
    expect(positionAfter(null)).toBe('00000000')
    expect(positionAfter('00000000')).toBe('00000001')
    expect(positionAfter('00000041')).toBe('00000042')
  })

  it('rejects invalid positions', () => {
    expect(() => positionForIndex(-1)).toThrow(RangeError)
    expect(() => positionForIndex(1.5)).toThrow(RangeError)
    expect(() => positionForIndex(100_000_000)).toThrow(RangeError)
  })
})
