# Red

A minimal CLI agent that uses Groq's chat completions with a small set of local tools (read, list, edit files, run commands) and asks for user approval before any edits or command execution.

## Requirements

- Node.js (ESM)
- Groq API key

## Install

```bash
npm install
```

## Configure

Set environment variables (for example in a `.env` file):

```bash
GROQ_API_KEY=your_api_key
# Optional
GROQ_MODEL=openai/gpt-oss-120b
```

## Build

```bash
npm run build
```

## Run

```bash
npm start
```

You will see a banner, then a `You:` prompt. The agent will think step-by-step, request approval for file edits and command execution, and print the final response when complete.

## Scripts

- `npm run build` - Compile TypeScript to `dist/`.
- `npm start` - Run the compiled agent entrypoint at `dist/agent.js`.

## Project Structure

- `src/agent.ts` - CLI entrypoint and prompt loop bootstrap.
- `src/agent/loop.ts` - Main agent loop and tool-call handling with approvals.
- `src/agent/groq.ts` - Groq client and model selection via env vars.
- `src/agent/tools.schema.ts` - Tool schema provided to the model.
- `src/tools/` - Implementations for `editFile`, `readFileContent`, `listDirectory`, and `runCommand`.

## Notes

- The agent blocks until you approve any file edits or command execution.
- If `GROQ_API_KEY` is not set, the app will throw on startup.

## License

ISC
