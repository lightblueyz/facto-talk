import 'dotenv/config'
import Fastify from 'fastify'
import { sendTextMessage } from './whatsapp'

const app = Fastify({ logger: true })

app.post('/webhook', async (request, reply) => {
  const payload = request.body as any

  app.log.info({ payload: JSON.stringify(payload) }, 'webhook recebido')

  // Ignora mensagens enviadas pelo próprio bot
  if (payload?.data?.key?.fromMe) {
    return reply.send({ ok: true })
  }

  const remoteJid = payload?.data?.key?.remoteJid
  if (!remoteJid) return reply.send({ ok: true })

  const phone = remoteJid.replace('@s.whatsapp.net', '')

  // Resposta de botão
  const buttonId = payload?.data?.message?.buttonsResponseMessage?.selectedButtonId
  if (buttonId) {
    if (buttonId === 'opt_in') {
      await sendTextMessage(phone, 'Que ótimo! Fico feliz que podemos nos falar por aqui 😊')
    } else if (buttonId === 'opt_out') {
      await sendTextMessage(phone, 'Tudo bem, obrigado pela resposta! 🙏')
    }
    return reply.send({ ok: true })
  }

  return reply.send({ ok: true })
})

const PORT = Number(process.env.PORT) || 3000

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
