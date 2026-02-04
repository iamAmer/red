import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export async function run_command(
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
