import Groq from 'groq-sdk'
import 'dotenv/config'

const GROQ_API_KEY = process.env.GROQ_API_KEY
if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY environment variable is not set.')

export const MODEL = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b'

export const groq = new Groq({ apiKey: GROQ_API_KEY })
