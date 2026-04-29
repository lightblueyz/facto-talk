import 'dotenv/config'
import { sendTextMessage } from './whatsapp'

const TO = process.argv[2]

if (!TO) {
  console.error('Uso: npx tsx src/send-test.ts 5511999999999')
  process.exit(1)
}

async function main() {
  console.log(`Enviando mensagem para ${TO}...`)
  const result = await sendTextMessage(TO, 'Oi! Mensagem de teste do Facto Talk Bot 🤖')
  console.log('Sucesso:', JSON.stringify(result, null, 2))
}

main().catch((err) => {
  console.error('Erro:', err.response?.data ?? err.message)
  process.exit(1)
})
