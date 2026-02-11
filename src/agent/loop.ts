import { askUserApproval } from './approvals.js'
import { groq, MODEL } from './groq.js'
import { agentState, type AgentState } from './state.js'
import { tools } from './tools.schema.js'
import {
  editFile,
  listDirectory,
  readFileContent,
  runCommand,
} from '../tools/index.js'

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function isGoalAchieved(state: AgentState): boolean {
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

export async function loop(userInput: string, state: AgentState = agentState) {
  state.messages.push({
    role: 'user',
    content: userInput,
  })

  while (!isGoalAchieved(state) && state.messages.length < 100) {
    console.log(`[Thinking... step ${state.messages.length - 1}]`)

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: state.messages as any,
      tools: tools as any,
    })

    const assistantMessage = completion.choices[0]?.message
    if (!assistantMessage) {
      console.error('Error: No response from AI')
      break
    }

    state.messages.push(assistantMessage as any)

    if (assistantMessage.tool_calls) {
      for (const toolCall of assistantMessage.tool_calls) {
        let args: any = {}
        try {
          args = JSON.parse(toolCall.function.arguments)
        } catch (error) {
          const message = `Error: Invalid tool arguments. ${String(
            (error as Error)?.message ?? error,
          )}`
          console.error(message)
          state.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: message,
          } as any)
          continue
        }

        if (toolCall.function.name === 'editFile') {
          const filePath = normalizeOptionalString(args?.filePath)
          if (!filePath) {
            const message = 'Error: editFile requires a non-empty filePath.'
            console.error(message)
            state.messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: message,
            } as any)
            continue
          }

          const findStr = typeof args?.findStr === 'string' ? args.findStr : ''
          const replaceStr =
            typeof args?.replaceStr === 'string' ? args.replaceStr : ''

          console.log(`\nEditing file: ${filePath}`)
          if (findStr !== '') {
            console.log(`Content to find\n\`\`\`\n${findStr}\n\`\`\``)
          }
          if (replaceStr !== '') {
            console.log(
              `Content to replace with\n\`\`\`\n${replaceStr}\n\`\`\``,
            )
          }

          if (!(await askUserApproval('Do you want to edit this file?'))) {
            console.log('File edit cancelled by user.')
            state.messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: 'File edit cancelled by user.',
            } as any)
            continue
          }

          const result = await editFile(filePath, findStr, replaceStr)
          console.log(result ? 'File edited successfully' : 'No changes made')

          state.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: String(result),
          } as any)
        } else if (toolCall.function.name === 'runCommand') {
          const command = normalizeOptionalString(args?.command)
          if (!command) {
            const message = 'Error: runCommand requires a non-empty command.'
            console.error(message)
            state.messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: message,
            } as any)
            continue
          }

          const workingDir = normalizeOptionalString(args?.workingDir)

          console.log(`\nExecuting command: ${command}`)

          if (
            !(await askUserApproval('Do you want to execute this command?'))
          ) {
            console.log('Command execution cancelled by user.')
            state.messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: 'Command execution cancelled by user.',
            } as any)
            continue
          }

          const [output] = await runCommand(command, workingDir)
          console.log(output)

          state.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: output,
          } as any)
        } else if (toolCall.function.name === 'listDirectory') {
          const dirPath = normalizeOptionalString(args?.dirPath) ?? '.'
          console.log(`\nListing directory: ${dirPath}`)
          const result = await listDirectory(dirPath)
          console.log(result)

          state.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          } as any)
        } else if (toolCall.function.name === 'readFileContent') {
          const filePath = normalizeOptionalString(args?.filePath)
          if (!filePath) {
            const message =
              'Error: readFileContent requires a non-empty filePath.'
            console.error(message)
            state.messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: message,
            } as any)
            continue
          }

          console.log(`\nReading file: ${filePath}`)
          const result = await readFileContent(filePath)
          console.log(result)

          state.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          } as any)
        }

        console.log()
      }
    }
  }

  const finalMessage = state.messages[state.messages.length - 1]
  if (finalMessage && finalMessage.role === 'assistant' && finalMessage.content) {
    console.log('\n' + '='.repeat(50))
    console.log('Assistant:', finalMessage.content)
    console.log('='.repeat(50) + '\n')
  }
}
