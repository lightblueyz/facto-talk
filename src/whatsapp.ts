import axios from 'axios'
import 'dotenv/config'

const BASE_URL = process.env.WHATSMIAU_BASE_URL!
const INSTANCE = process.env.WHATSMIAU_INSTANCE!
const API_KEY = process.env.WHATSMIAU_API_KEY!

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    apikey: API_KEY,
    'Content-Type': 'application/json',
  },
})

export async function sendTextMessage(to: string, text: string) {
  const response = await client.post(`/v2/message/sendText/${INSTANCE}`, {
    number: to,
    text,
  })
  return response.data
}
