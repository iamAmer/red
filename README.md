# Red

A minimal CLI coding agent powered by Groq that automates development tasks with local tools and built-in safety guardrails.

[![npm version](https://badge.fury.io/js/red-agent.svg)](https://www.npmjs.com/package/red-agent)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## What is Red?

Red is a lightweight coding agent that runs in your terminal. It can:

- Read files and explore directories
- Edit files with find-and-replace
- Run shell commands
- Make autonomous decisions about which tools to use
- Ask for approval before any destructive actions

## Quick Start

### Global Installation

```bash
npm install -g red-agent
```

### Setup

1. Get a Groq API key from [console.groq.com](https://console.groq.com)

2. Set your API key:

```bash
export GROQ_API_KEY=your_api_key_here
```

Or create a `.env` file in your project:

```bash
GROQ_API_KEY=your_api_key_here
GROQ_MODEL=openai/gpt-oss-120b  # Optional: default model
```

3. Run Red:

```bash
red
```

## Usage

### Basic Workflow

```bash
$ red
Red Agent v1.0.0
Type your request and press Enter. Ctrl+C to exit.

You: Fix the bug in auth.js where users can't log in with email

[Agent thinks...]
[Agent requests to read auth.js]
[Agent identifies the issue]
[Agent asks approval to edit auth.js]

Approve this edit? (y/n): y

[Agent applies fix]
[Agent runs tests to verify]

Task completed!
```

### Example Tasks

**Refactor code:**
```bash
You: Refactor all the functions in utils.js to use async/await instead of callbacks
```

**Add features:**
```bash
You: Add input validation to the user registration endpoint
```

**Debug issues:**
```bash
You: Find out why the server is crashing on startup and fix it
```

## Local Development

If you want to contribute or modify Red:

### Clone and Install

```bash
git clone https://github.com/iamAmer/red.git
cd red
npm install
```

### Build

```bash
npm run build
```

This compiles TypeScript from `src/` to `dist/`.

### Run Locally

```bash
npm start
```

Or link it globally for testing:

```bash
npm link
red
```

## How It Works

Red is built on three core components:

### 1. Tools (Actions)

Red has access to four essential tools:

- **`readFileContent(path)`** - Read file contents
- **`listDirectory(path)`** - List files and directories
- **`editFile(path, find, replace)`** - Replace text in files
- **`runCommand(command, cwd?)`** - Execute shell commands

### 2. Autonomy (Loop)

The agent runs in a loop:

1. **Think** - Analyze the current state
2. **Act** - Choose and execute tools
3. **Observe** - Process tool outputs
4. **Repeat** - Continue until task is complete

### 3. Guardrails (Safety)

Before any destructive action (edits, commands), Red:

- Shows you exactly what it wants to do
- Waits for your approval (`y/n`)
- Only proceeds if you confirm

## Project Structure

```
red/
├── src/
│   ├── agent.ts              # CLI entrypoint
│   ├── agent/
│   │   ├── approvals.ts      # User approval prompts for destructive actions
│   │   ├── groq.ts           # Groq client configuration
│   │   ├── loop.ts           # Main agent loop with tool execution
│   │   ├── state.ts          # Conversation state management
│   │   └── tools.schema.ts   # Tool schemas for the model
│   └── tools/
│       ├── editFile.ts       # Find and replace in files
│       ├── index.ts          # Tool exports
│       ├── listDirectory.ts  # Directory listing
│       ├── readFileContent.ts # File reading
│       └── runCommand.ts     # Shell command execution
├── dist/                     # Compiled JavaScript (generated)
│   └── agent.js              # ← Must have shebang for CLI
├── node_modules/
├── .npmignore                # Exclude src/ from npm package
├── package.json              # Package metadata and configuration
├── tsconfig.json             # TypeScript configuration
├── README.md                 # This file
├── LICENSE                   # ISC License
├── CHANGELOG.md              # Version history
└── .env                      # API keys (gitignored)
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | Yes | - | Your Groq API key |
| `GROQ_MODEL` | No | `openai/gpt-oss-120b` | Groq model to use |

### Supported Models

Red works with any Groq model that supports function calling:

- `openai/gpt-oss-120b` (default, fast and capable)
- `llama-3.3-70b-versatile`
- `mixtral-8x7b-32768`
- `gemma2-9b-it`

## Safety Features

### Approval Gates

Red will **always** ask before:

- Editing any file
- Running any shell command
- Making changes to your filesystem

### What Red Won't Do

Red is designed to be safe by default. It will refuse to:

- Run destructive commands without approval
- Edit files without showing you the exact changes
- Continue if you deny an approval request

## Troubleshooting

### "GROQ_API_KEY is not set"

**Solution:** Export the environment variable or create a `.env` file:

```bash
export GROQ_API_KEY=your_key_here
```

### "Command not found: red"

**Solution:** Make sure Red is installed globally:

```bash
npm install -g red-agent
```

Or if developing locally:

```bash
npm link
```

### Agent is stuck in a loop

**Solution:** Press `Ctrl+C` to stop. Red has a max iteration limit, but you can always interrupt manually.

### Tool execution fails

**Solution:** Check that:
- File paths are correct (absolute or relative to current directory)
- You have read/write permissions
- Commands are valid for your OS

## Performance Tips

### Token Usage

Red uses Groq's API, which is fast and cost-effective. To optimize:

- Be specific in your requests
- Break large tasks into smaller chunks
- Review and approve actions promptly

### Context Management

For large codebases:

- Start Red in the specific directory you want to work in
- Give focused, specific instructions
- Use Red for one task at a time

## Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow the existing code style
- Add comments for complex logic
- Test your changes locally before submitting
- Update documentation if you change functionality

## Support

- **Bugs:** [GitHub Issues](https://github.com/iamAmer/red/issues)
- **Discussions:** [GitHub Discussions](https://github.com/iamAmer/red/discussions)
- **Email:** muhammedamer7810@gmail.com

## License

ISC © Muhammed Amer
