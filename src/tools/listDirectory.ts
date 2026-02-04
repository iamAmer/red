import fs from 'node:fs/promises'
import path from 'node:path'

export async function listDirectory(dirPath: string = '.'): Promise<string> {
  try {
    const items = await fs.readdir(dirPath)

    if (items.length === 0) {
      return `Directory '${dirPath}' is empty.`
    }
    let result = `Contents of directory '${dirPath}':\n`

    for (const item of items) {
      const fullPath = path.join(dirPath, item)

      let itemType: 'Directory' | 'File' = 'File'
      try {
        const stats = await fs.stat(fullPath)
        itemType = stats.isDirectory() ? 'Directory' : 'File'
      } catch {
        itemType = 'File'
      }

      result += `- ${item} (${itemType})\n`
    }

    return result.trimEnd()
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return `Error: Directory '${dirPath}' not found.`
    }
    if (error?.code === 'EACCES' || error?.code === 'EPERM') {
      return `Error: Permission denied to access '${dirPath}'.`
    }
    return `Error listing directory '${dirPath}': ${String(error?.message ?? error)}`
  }
}
