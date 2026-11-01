import type { PageCover } from '@inkwell/shared'

export const NOTEBOOK_ICONS = ['📚', '📓', '🗂️', '🧭', '🏛️', '🧪', '🎨', '🌿'] as const

export const PAGE_ICONS = ['📄', '📝', '🧭', '🌿', '✦', '🔖', '☕', '🌙', '🪶', '🗺️'] as const

export const SECTION_COLORS = [
  { value: '#D9A441', label: 'Ochre' },
  { value: '#6E8B74', label: 'Sage' },
  { value: '#8A6FA8', label: 'Iris' },
  { value: '#C96F53', label: 'Clay' },
  { value: '#5B6CFF', label: 'Ink' },
  { value: '#A98B5F', label: 'Umber' },
] as const

export const PAGE_COVERS: { value: PageCover; label: string; gradient: string }[] = [
  {
    value: 'linen',
    label: 'Linen',
    gradient: 'linear-gradient(120deg, #d9a44155, #f4efe5 45%, #b9c7b0)',
  },
  {
    value: 'dusk',
    label: 'Dusk',
    gradient: 'linear-gradient(120deg, #345b63, #1b2430 55%, #8a6fa8)',
  },
  {
    value: 'moss',
    label: 'Moss',
    gradient: 'linear-gradient(120deg, #6e8b74, #dce8e4 60%, #f4efe5)',
  },
  {
    value: 'clay',
    label: 'Clay',
    gradient: 'linear-gradient(120deg, #c96f53, #d9a44155 55%, #f4efe5)',
  },
]

export function coverGradient(cover: PageCover | null): string | null {
  return PAGE_COVERS.find((option) => option.value === cover)?.gradient ?? null
}

export function sectionColorLabel(color: string): string {
  return SECTION_COLORS.find((option) => option.value.toLowerCase() === color.toLowerCase())?.label ?? 'Custom'
}
