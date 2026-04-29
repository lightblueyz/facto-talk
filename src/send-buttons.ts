import 'dotenv/config'
import axios from 'axios'

const BASE_URL = process.env.WHATSMIAU_BASE_URL!
const INSTANCE = process.env.WHATSMIAU_INSTANCE!
const API_KEY = process.env.WHATSMIAU_API_KEY!

const client = axios.create({
  baseURL: BASE_URL,
  headers: { apikey: API_KEY, 'Content-Type': 'application/json' },
})

const TO = process.argv[2]

if (!TO) {
  console.error('Uso: npx tsx src/send-buttons.ts 5519998170609')
  process.exit(1)
}

async function main() {
  console.log(`Enviando botões para ${TO}...`)

  const result = await client.post(`/v2/message/sendButtons/${INSTANCE}`, {
    number: TO,
    title: 'Autorização de Contato',
    description: 'Olá! Podemos enviar mensagens para você por aqui? 😊',
    footer: 'Facto Talk',
    buttons: [
      { type: 'reply', displayText: 'Sim, pode enviar ✅', id: 'opt_in' },
      { type: 'reply', displayText: 'Não, obrigado ❌', id: 'opt_out' },
    ],
  })

  console.log('Sucesso:', JSON.stringify(result.data, null, 2))
}

main().catch((err) => {
  console.error('Erro:', err.response?.data ?? err.message)
  process.exit(1)
})
