import * as fs from 'node:fs/promises'
import * as path from 'node:path'

async function list_directory(dirPath: string = '.'): Promise<string> {
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

// Test runner:
;(async () => {
  const output = await list_directory('.') // or pass another path
  console.log(output)
})()
