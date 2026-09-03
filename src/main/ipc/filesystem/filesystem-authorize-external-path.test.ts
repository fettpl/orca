import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join, parse, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { Store } from '../../persistence'
import {
  grantExternalDirectoryFromRenderer,
  grantExternalFileFromRenderer,
  isPathAllowed
} from '../filesystem-auth'

function emptyStore(): Store {
  return {
    getRepos: () => [],
    getProjectGroups: () => [],
    getFolderWorkspaces: () => [],
    getSettings: () => ({})
  } as unknown as Store
}

describe('renderer external path grants', () => {
  const tempDirs: string[] = []

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  async function makeTempDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'orca-allowlist-'))
    tempDirs.push(dir)
    return dir
  }

  it('does not grant a missing probe path through the renderer file grant', async () => {
    const probe = join(tmpdir(), 'orca-allowlist-probe')
    await expect(grantExternalFileFromRenderer(probe)).rejects.toThrow()
    expect(isPathAllowed(probe, emptyStore())).toBe(false)
  })

  it('rejects granting the home directory and leaves it denied', async () => {
    const home = homedir()
    await expect(grantExternalFileFromRenderer(home)).rejects.toThrow()
    await expect(grantExternalDirectoryFromRenderer(home)).rejects.toThrow()
    expect(isPathAllowed(home, emptyStore())).toBe(false)
  })

  it('rejects granting the volume root', async () => {
    const volumeRoot = parse(process.cwd()).root
    await expect(grantExternalFileFromRenderer(volumeRoot)).rejects.toThrow()
    await expect(grantExternalDirectoryFromRenderer(volumeRoot)).rejects.toThrow()
    expect(isPathAllowed(volumeRoot, emptyStore())).toBe(false)
  })

  it('grants a real temp file without allowing a sibling in the same directory', async () => {
    const dir = await makeTempDir()
    const filePath = join(dir, 'leaf.txt')
    const siblingPath = join(dir, 'sibling.txt')
    await writeFile(filePath, 'leaf')
    await writeFile(siblingPath, 'sibling')

    await grantExternalFileFromRenderer(filePath)

    const store = emptyStore()
    expect(isPathAllowed(filePath, store)).toBe(true)
    expect(isPathAllowed(siblingPath, store)).toBe(false)
    expect(isPathAllowed(dir, store)).toBe(false)
  })

  it('rejects granting a temp directory so descendants stay denied', async () => {
    const dir = await makeTempDir()
    const nested = join(dir, 'nested.txt')
    await writeFile(nested, 'nested')

    await expect(grantExternalFileFromRenderer(dir)).rejects.toThrow()
    expect(isPathAllowed(dir, emptyStore())).toBe(false)
    expect(isPathAllowed(nested, emptyStore())).toBe(false)
  })

  it('rejects empty, NUL, and relative renderer grant paths', async () => {
    await expect(grantExternalFileFromRenderer('')).rejects.toThrow()
    await expect(grantExternalFileFromRenderer(`bad\0path`)).rejects.toThrow()
    await expect(grantExternalFileFromRenderer('relative/file.txt')).rejects.toThrow()
    expect(isPathAllowed(resolve('relative/file.txt'), emptyStore())).toBe(false)
  })

  it('grants a real temp directory that is not homedir or volume root', async () => {
    const dir = await makeTempDir()
    const nested = join(dir, 'nested.txt')
    await writeFile(nested, 'nested')

    await grantExternalDirectoryFromRenderer(dir)

    const store = emptyStore()
    expect(isPathAllowed(dir, store)).toBe(true)
    expect(isPathAllowed(nested, store)).toBe(true)
  })
})
