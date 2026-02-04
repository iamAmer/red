export const tools = [
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
        required: [],
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
