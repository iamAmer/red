#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import readline from 'node:readline'
import { loop } from './agent/loop.js'

type SplashInfo = {
  version: string
  profile: string
  cwd: string
}

const BANNER = [
  '██████╗ ███████╗██████╗ ',
  '██╔══██╗██╔════╝██╔══██╗',
  '██████╔╝█████╗  ██║  ██║',
  '██╔══██╗██╔══╝  ██║  ██║',
  '██║  ██║███████╗██████╔╝',
  '╚═╝  ╚═╝╚══════╝╚═════╝ ',
]

function colorizeGradient(lines: string[]): string[] {
  if (!process.stdout.isTTY) return lines

  const colors = [196, 196, 196, 196, 202, 208]
  const steps = Math.max(lines.length - 1, 1)
  return lines.map((line, i) => {
    const t = i / steps
    const colorIdx = Math.round(t * (colors.length - 1))
    const color = colors[colorIdx] ?? 36
    return `\u001b[38;5;${color}m${line}\u001b[0m`
  })
}

async function readPackageVersion(): Promise<string> {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json')
    const content = await fs.readFile(pkgPath, { encoding: 'utf8' })
    const parsed = JSON.parse(content) as { version?: string }
    return parsed.version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

async function getSplashInfo(): Promise<SplashInfo> {
  const version = await readPackageVersion()
  const cwd = process.cwd()
  return { version, profile: '', cwd }
}

function printSplash(info: SplashInfo) {
  const bannerLines = colorizeGradient(BANNER)
  for (const line of bannerLines) {
    console.log(line)
  }
  console.log(`version: ${info.version}`)
  console.log(`cwd: ${info.cwd}`)
  console.log()
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
  const splash = await getSplashInfo()
  printSplash(splash)

  const userInput = await getUserInput('You: ')

  if (!userInput.trim()) {
    console.log('No input provided. Exiting.')
    return
  }

  await loop(userInput)

  console.log('\nTask completed!')
}

main().catch(console.error)
