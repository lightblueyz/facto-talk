import { GoogleGenerativeAI, Tool, FunctionCallingMode } from '@google/generative-ai'
import axios from 'axios'
import { sendTextMessage } from './whatsapp'

const genai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)

const SEU_FIDELIS_URL = process.env.SEU_FIDELIS_URL ?? 'https://seufidelis.facto.ia.br'

const TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'send_whatsapp_message',
        description: 'Envia uma mensagem de texto para o cliente no WhatsApp',
        parameters: {
          type: 'OBJECT' as any,
          properties: {
            text: { type: 'STRING' as any, description: 'Texto da mensagem a ser enviada' },
          },
          required: ['text'],
        },
      },
      {
        name: 'consultar_pontos',
        description: 'Consulta o saldo de pontos de um cliente pelo CPF no programa Seu Fidelis. Retorna lista de empresas com saldo.',
        parameters: {
          type: 'OBJECT' as any,
          properties: {
            cpf: { type: 'STRING' as any, description: 'CPF do cliente (só números, sem pontos ou traços)' },
          },
          required: ['cpf'],
        },
      },
    ],
  },
]

const SYSTEM_INSTRUCTION = `Você é o assistente do Facto Insights, plataforma de fidelização de clientes.
Seu trabalho é atender clientes pelo WhatsApp de forma simpática, direta e em português brasileiro.
Use mensagens curtas, no estilo WhatsApp.
Para responder ao cliente, use a tool send_whatsapp_message.
Você pode enviar mais de uma mensagem se fizer sentido.

Quando o cliente quiser consultar seus pontos:
1. Peça o CPF (só se ainda não foi informado)
2. Chame a tool consultar_pontos com o CPF (só números)
3. Se retornar pontos, informe o saldo de forma clara e amigável
4. Se retornar vazio, informe que não encontrou pontos cadastrados para esse CPF`

// Histórico de conversa por número (em memória)
const histories = new Map<string, { role: string; parts: any[] }[]>()

async function executeTool(name: string, args: any, phone: string): Promise<any> {
  if (name === 'send_whatsapp_message') {
    await sendTextMessage(phone, args.text)
    return { success: true }
  }

  if (name === 'consultar_pontos') {
    const cpf = String(args.cpf ?? '').replace(/\D/g, '')
    try {
      const res = await axios.get(`${SEU_FIDELIS_URL}/api/customer/cards/${cpf}`, { timeout: 10000 })
      const cards = res.data as { nome: string; saldo_total: number; cidade?: string }[]
      if (!cards.length) return { encontrado: false }
      return {
        encontrado: true,
        cartoes: cards.map(c => ({ empresa: c.nome, saldo: c.saldo_total, cidade: c.cidade })),
      }
    } catch (err: any) {
      return { erro: err?.message ?? 'Falha ao consultar pontos' }
    }
  }

  return { erro: 'tool desconhecida' }
}

export async function runAgent(phone: string, incomingText: string): Promise<void> {
  const model = genai.getGenerativeModel({
    model: 'gemini-flash-lite-latest',
    systemInstruction: SYSTEM_INSTRUCTION,
    tools: TOOLS,
    toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
  })

  const history = histories.get(phone) ?? []
  const chat = model.startChat({ history })

  let response = await chat.sendMessage(incomingText)

  for (let turn = 0; turn < 5; turn++) {
    const parts = response.response.candidates?.[0]?.content?.parts ?? []
    const toolCalls = parts.filter((p: any) => p.functionCall)
    if (!toolCalls.length) break

    const toolResults = await Promise.all(
      toolCalls.map(async (part: any) => {
        const { name, args } = part.functionCall
        const result = await executeTool(name, args, phone)
        return { functionResponse: { name, response: result } }
      })
    )

    response = await chat.sendMessage(toolResults)
  }

  histories.set(phone, await chat.getHistory())
}
