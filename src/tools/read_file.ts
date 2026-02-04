import fs from 'node:fs/promises'

export async function read_file_content(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, { encoding: 'utf8' })

    if (content.length > 2000) {
      const firstPart = content.slice(0, 1000)
      const lastPart = content.slice(-1000)
      return `${firstPart}\n\n[...content clipped...]\n\n${lastPart}`
    }

    return content
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return `Error: File '${filePath}' not found.`
    }
    if (error?.code === 'EACCES' || error?.code === 'EPERM') {
      return `Error: Permission denied to access '${filePath}'.`
    }
    if (
      error?.code === 'ERR_INVALID_CHAR' ||
      error?.code === 'ERR_ENCODING_INVALID_ENCODED_DATA'
    ) {
      return `Error: Unable to decode '${filePath}'. The file might be binary or use an unsupported encoding.`
    }

    return `Error reading file '${filePath}': ${String(error?.message ?? error)}`
  }
}
