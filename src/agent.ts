import readline from 'node:readline'
import { loop } from './agent/loop.js'

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
