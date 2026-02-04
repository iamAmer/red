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
        const args = JSON.parse(toolCall.function.arguments)

        if (toolCall.function.name === 'editFile') {
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
            state.messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: 'File edit cancelled by user.',
            } as any)
            continue
          }

          const result = await editFile(
            args.filePath,
            args.findStr,
            args.replaceStr,
          )
          console.log(result ? 'File edited successfully' : 'No changes made')

          state.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: String(result),
          } as any)
        } else if (toolCall.function.name === 'runCommand') {
          console.log(`\nExecuting command: ${args.command}`)

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

          const [output] = await runCommand(args.command, args.workingDir)
          console.log(output)

          state.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: output,
          } as any)
        } else if (toolCall.function.name === 'listDirectory') {
          console.log(`\nListing directory: ${args.dirPath || '.'}`)
          const result = await listDirectory(args.dirPath)
          console.log(result)

          state.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          } as any)
        } else if (toolCall.function.name === 'readFileContent') {
          console.log(`\nReading file: ${args.filePath}`)
          const result = await readFileContent(args.filePath)
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
