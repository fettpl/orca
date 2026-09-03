import { beforeEach, describe, expect, it, vi } from 'vitest'

const accessMock = vi.hoisted(() => vi.fn())

vi.mock('node:fs/promises', () => ({
  access: accessMock
}))

import { parseUnmergedEntry } from './git-unmerged-entry'

const DELETED_BY_US = 'u DU N... 100644 100644 100644 100644 aa bb cc secret.ts'

describe('parseUnmergedEntry', () => {
  beforeEach(() => {
    accessMock.mockReset()
  })

  it('decodes a C-quoted unmerged path', async () => {
    const entry = await parseUnmergedEntry(
      '/wt',
      'u UU N... 100644 100644 100644 100644 aa bb cc "path with space.ts"'
    )
    expect(entry?.path).toBe('path with space.ts')
  })

  it('treats ENOENT as deleted for asymmetric conflicts', async () => {
    accessMock.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
    const entry = await parseUnmergedEntry('/wt', DELETED_BY_US)
    expect(entry?.status).toBe('deleted')
  })

  it('treats ENOTDIR as deleted for asymmetric conflicts', async () => {
    accessMock.mockRejectedValueOnce(Object.assign(new Error('ENOTDIR'), { code: 'ENOTDIR' }))
    const entry = await parseUnmergedEntry('/wt', DELETED_BY_US)
    expect(entry?.status).toBe('deleted')
  })

  it('keeps EACCES as modified rather than deleted', async () => {
    accessMock.mockRejectedValueOnce(Object.assign(new Error('EACCES'), { code: 'EACCES' }))
    const entry = await parseUnmergedEntry('/wt', DELETED_BY_US)
    expect(entry?.status).toBe('modified')
  })
})
