import fs, { type FileHandle } from 'node:fs/promises'

export async function editFile(
  filePath: string,
  findStr: string,
  replaceStr: string,
): Promise<boolean> {
  if (!filePath) throw new Error('filePath is required')

  let fileHandle: FileHandle | undefined

  const overwriteFile = async (): Promise<boolean> => {
    try {
      const existing = await fs.readFile(filePath, { encoding: 'utf8' })
      if (existing === replaceStr) return false
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error
    }

    await fs.writeFile(filePath, replaceStr, { encoding: 'utf8' })
    return true
  }

  const editExistingFile = async (): Promise<boolean> => {
    fileHandle = await fs.open(filePath, 'r+')

    const content = await fileHandle.readFile({ encoding: 'utf-8' })
    const updatedContent = content.split(findStr).join(replaceStr)

    if (updatedContent === content) return false

    await fileHandle.truncate(0)
    await fileHandle.writeFile(updatedContent, { encoding: 'utf8' })

    return true
  }

  try {
    if (findStr === '') {
      return await overwriteFile()
    }

    return await editExistingFile()
  } catch (error: any) {
    if (error?.code !== 'ENOENT') throw error

    try {
      if (findStr === '') {
        await fs.writeFile(filePath, replaceStr, {
          encoding: 'utf8',
          flag: 'wx',
        })
        return true
      }

      await fs.writeFile(filePath, replaceStr, { encoding: 'utf8', flag: 'wx' })
      return true
    } catch (e: any) {
      if (e?.code === 'EEXIST') {
        if (findStr === '') {
          return await overwriteFile()
        }

        return await editExistingFile()
      }
      throw e
    }
  } finally {
    await fileHandle?.close()
  }
}
