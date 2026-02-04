import Groq from 'groq-sdk'
import 'dotenv/config'

const groqApiKey = process.env.GROQ_API_KEY
if (!groqApiKey) throw new Error('GROQ_API_KEY environment variable is not set.')

export const MODEL = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b'

export const groq = new Groq({ apiKey: groqApiKey })
