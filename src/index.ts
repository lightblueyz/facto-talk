import 'dotenv/config'
import Fastify from 'fastify'
import axios from 'axios'
import { sendTextMessage } from './whatsapp'

const app = Fastify({ logger: true })

// ── Auth middleware ──────────────────────────────────────────────────────────
const API_TOKEN = process.env.TALK_API_TOKEN

function requireToken(request: any, reply: any, done: () => void) {
  if (!API_TOKEN) return done()
  const auth = request.headers['authorization'] ?? ''
  if (auth !== `Bearer ${API_TOKEN}`) {
    reply.code(401).send({ error: 'Unauthorized' })
    return
  }
  done()
}

// ── POST /send-text ──────────────────────────────────────────────────────────
app.post('/send-text', { preHandler: requireToken }, async (request, reply) => {
  const { number, text } = request.body as { number?: string; text?: string }

  if (!number || !text) {
    return reply.code(400).send({ error: 'number e text são obrigatórios' })
  }

  try {
    const result = await sendTextMessage(number, text)
    return reply.send({ ok: true, result })
  } catch (err: any) {
    app.log.error({ err: err?.response?.data || err?.message }, 'Erro ao enviar mensagem')
    return reply.code(502).send({ error: 'Falha ao enviar mensagem', detail: err?.response?.data })
  }
})

// ── POST /webhook ────────────────────────────────────────────────────────────
app.post('/webhook', async (request, reply) => {
  const payload = request.body as any

  app.log.info({ payload: JSON.stringify(payload) }, 'webhook recebido')

  if (payload?.data?.key?.fromMe) {
    return reply.send({ ok: true })
  }

  const remoteJid = payload?.data?.key?.remoteJid
  if (!remoteJid) return reply.send({ ok: true })

  const phone = remoteJid.replace('@s.whatsapp.net', '')

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

// ── Startup ──────────────────────────────────────────────────────────────────
async function registerWebhook() {
  const publicUrl = process.env.TALK_PUBLIC_URL
  const instance = process.env.WHATSMIAU_INSTANCE
  const apiKey = process.env.WHATSMIAU_API_KEY
  const baseUrl = process.env.WHATSMIAU_BASE_URL

  if (!publicUrl || !instance || !apiKey || !baseUrl) {
    app.log.warn('TALK_PUBLIC_URL não definida — webhook não registrado automaticamente')
    return
  }

  try {
    await axios.post(
      `${baseUrl}/v2/webhook/set/${instance}`,
      { url: `${publicUrl}/webhook`, enabled: true, events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE'] },
      { headers: { apikey: apiKey, 'Content-Type': 'application/json' } }
    )
    app.log.info(`Webhook registrado: ${publicUrl}/webhook`)
  } catch (err: any) {
    app.log.error({ err: err?.response?.data || err?.message }, 'Falha ao registrar webhook')
  }
}

const PORT = Number(process.env.PORT) || 3000

app.listen({ port: PORT, host: '0.0.0.0' }, async (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  await registerWebhook()
})
