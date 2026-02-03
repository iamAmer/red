import Groq from 'groq-sdk'
import fs, { type FileHandle } from 'node:fs/promises'
import path from 'node:path'
import { exec } from 'child_process'
import { promisify } from 'util'
import readline from 'readline'
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

Tool use rules:
- Use the provided tool calling interface only (tool_calls with JSON arguments).
- Do NOT use XML-like tags such as <function=...> or markdown to call tools.
- If you need to run multiple tools, issue multiple tool calls.

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

async function read_file_content(filePath: string): Promise<string> {
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

const execAsync = promisify(exec)

async function run_command(
  command: string,
  workingDir?: string,
): Promise<[string, number]> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: workingDir,
      maxBuffer: 10 * 1024 * 1024,
    })

    let output = stdout + stderr

    if (output.length > 2000) {
      output =
        output.slice(0, 1000) +
        '\n\n[...content clipped...]\n\n' +
        output.slice(-1000)
    }

    return [output, 0]
  } catch (error: any) {
    if (error.stdout !== undefined || error.stderr !== undefined) {
      let output = (error.stdout || '') + (error.stderr || '')

      if (output.length > 2000) {
        output =
          output.slice(0, 1000) +
          '\n\n[...content clipped...]\n\n' +
          output.slice(-1000)
      }

      return [output, error.code || 1]
    }

    return [error.message || String(error), 1]
  }
}

const tools = [
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description:
        'Apply a diff to a file by replacing occurrences of findStr with replaceStr.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'The path of the file to modify',
          },
          findStr: {
            type: 'string',
            description: 'The string to find in the file',
          },
          replaceStr: {
            type: 'string',
            description: 'The string to replace with',
          },
        },
        required: ['filePath', 'findStr', 'replaceStr'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Run a shell command and return its output and error code.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The command to run in the shell',
          },
          workingDir: {
            type: 'string',
            description:
              'The working directory to run the command in (optional)',
          },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'List the contents of a directory.',
      parameters: {
        type: 'object',
        properties: {
          dirPath: {
            type: 'string',
            description:
              'The path to the directory to list. Defaults to the current directory.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file_content',
      description: 'Read and return the content of a file.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'The path to the file to read.',
          },
        },
        required: ['filePath'],
      },
    },
  },
]

const groq = new Groq({ apiKey: GROQ_API_KEY })

function isGoalAchieved(state: typeof agent_state): boolean {
  if (state.messages.length <= 2) {
    return false
  }

  const lastMessage = state.messages[state.messages.length - 1]

  if (!lastMessage) {
    return false
  }

  return (
    'role' in lastMessage &&
    lastMessage.role === 'assistant' &&
    !('tool_calls' in lastMessage)
  )
}

function askUserApproval(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(`${message} (y/n): `, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })
}

async function loop(userInput: string) {
  agent_state.messages.push({
    role: 'user',
    content: userInput,
  })

  while (!isGoalAchieved(agent_state) && agent_state.messages.length < 100) {
    console.log(`[Thinking... step ${agent_state.messages.length - 1}]`)

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: agent_state.messages as any,
      tools: tools as any,
    })

    const assistantMessage = completion.choices[0]?.message
    if (!assistantMessage) {
      console.error('Error: No response from AI')
      break
    }

    agent_state.messages.push(assistantMessage as any)

    if (assistantMessage.tool_calls) {
      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments)

        if (toolCall.function.name === 'edit_file') {
          console.log(`\nEditing file: ${args.filePath}`)
          if (args.findStr !== '') {
            console.log(`Content to find\n\`\`\`\n${args.findStr}\n\`\`\``)
          }
          if (args.replaceStr !== '') {
            console.log(
              `Content to replace with\n\`\`\`\n${args.replaceStr}\n\`\`\``,
            )
          }

          if (!(await askUserApproval('Do you want to edit this file?'))) {
            console.log('File edit cancelled by user.')
            agent_state.messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: 'File edit cancelled by user.',
            } as any)
            continue
          }

          const result = await edit_file(
            args.filePath,
            args.findStr,
            args.replaceStr,
          )
          console.log(result ? 'File edited successfully' : 'No changes made')

          agent_state.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: String(result),
          } as any)
        } else if (toolCall.function.name === 'run_command') {
          console.log(`\nExecuting command: ${args.command}`)

          if (
            !(await askUserApproval('Do you want to execute this command?'))
          ) {
            console.log('Command execution cancelled by user.')
            agent_state.messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: 'Command execution cancelled by user.',
            } as any)
            continue
          }

          const [output, code] = await run_command(
            args.command,
            args.workingDir,
          )
          console.log(output)

          agent_state.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: output,
          } as any)
        } else if (toolCall.function.name === 'list_directory') {
          console.log(`\nListing directory: ${args.dirPath || '.'}`)
          const result = await list_directory(args.dirPath)
          console.log(result)

          agent_state.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          } as any)
        } else if (toolCall.function.name === 'read_file_content') {
          console.log(`\nReading file: ${args.filePath}`)
          const result = await read_file_content(args.filePath)
          console.log(result)

          agent_state.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          } as any)
        }

        console.log()
      }
    }
  }

  const finalMessage = agent_state.messages[agent_state.messages.length - 1]
  if (
    finalMessage &&
    finalMessage.role === 'assistant' &&
    finalMessage.content
  ) {
    console.log('\n' + '='.repeat(50))
    console.log('Assistant:', finalMessage.content)
    console.log('='.repeat(50) + '\n')
  }
}

function getUserInput(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

async function main() {
  console.log('='.repeat(50))
  console.log('RED is here, how could i assist you, sir :)')
  console.log('='.repeat(50))
  console.log('Type your coding task and press Enter.')
  console.log('RED will help you complete it step by step.\n')

  const userInput = await getUserInput('You: ')

  if (!userInput.trim()) {
    console.log('No input provided. Exiting.')
    return
  }

  await loop(userInput)

  console.log('\nTask completed!')
}

main().catch(console.error)
