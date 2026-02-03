import Groq from 'groq-sdk'
import fs, { type FileHandle } from 'node:fs/promises'
import path from 'node:path'
import 'dotenv/config'

const GROQ_API_KEY = process.env.GROQ_API_KEY

if (!GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY environment variable is not set.')
}

const agent_state = {
  messages: [
    {
      role: 'system',
      content:
        `You are a helpful coding assistant. Your goal is to help the user with programming tasks.
            
You have access to the following tools:
1. edit_file: Modify files by replacing text or create new files
2. run_command: Execute shell commands
3. list_directory: View the contents of directories
4. read_file_content: Read the content of files

For each user request:
1. Understand what the user is trying to accomplish
2. Break down complex tasks into smaller steps
3. Use your tools to gather information about the codebase when needed
4. Implement solutions by writing or modifying code
5. Explain your reasoning and approach

When modifying code, be careful to maintain the existing style and structure. Test your changes when possible.
If you're unsure about something, ask clarifying questions before proceeding.

You must run and test your changes before reporting success.`.trim(),
    },
  ],
}

async function edit_file(
  filePath: string,
  findStr: string,
  replaceStr: string,
): Promise<boolean> {
  if (!filePath) throw new Error('filePath is required')
  if (findStr === '') return false

  let fileHandle: FileHandle | undefined

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

  } catch (error: any) {
    if (error?.code !== 'ENOENT') throw error

    try {
      await fs.writeFile(filePath, replaceStr, { encoding: 'utf8', flag: 'wx' })
      return true
    } catch (e: any) {
      if (e?.code === 'EEXIST') {
        return await editExistingFile()
      }
      throw e
    }
  } finally {
    await fileHandle?.close()
  }
  return false
}

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
    if (error?.code === "ENOENT") {
      return `Error: Directory '${dirPath}' not found.`;
    }
    if (error?.code === "EACCES" || error?.code === "EPERM") {
      return `Error: Permission denied to access '${dirPath}'.`;
    }
    return `Error listing directory '${dirPath}': ${String(error?.message ?? error)}`;
  }
}

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

const groq = new Groq({ apiKey: GROQ_API_KEY })
async function main() {
  const chatCompletion = await getGroqChatCompletion()
  // Print the completion returned by the LLM.
  console.log(chatCompletion.choices[0]?.message?.content || '')
}

async function getGroqChatCompletion() {
  return groq.chat.completions.create({
    messages: [
      {
        role: 'user',
        content: 'say hello in arabic',
      },
    ],
    model: 'openai/gpt-oss-20b',
  })
}

main()
