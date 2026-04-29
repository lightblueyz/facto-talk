import { GoogleGenerativeAI, Tool, FunctionCallingMode } from '@google/generative-ai'
import { sendTextMessage } from './whatsapp'

const genai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)

const TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'send_whatsapp_message',
        description: 'Envia uma mensagem de texto para o cliente no WhatsApp',
        parameters: {
          type: 'OBJECT' as any,
          properties: {
            text: {
              type: 'STRING' as any,
              description: 'Texto da mensagem a ser enviada',
            },
          },
          required: ['text'],
        },
      },
    ],
  },
]

const SYSTEM_INSTRUCTION = `Você é o assistente do Facto Insights, plataforma de fidelização de clientes.
Seu trabalho é atender clientes pelo WhatsApp de forma simpática, direta e em português brasileiro.
Use mensagens curtas, no estilo WhatsApp.
Para responder ao cliente, use a tool send_whatsapp_message.
Você pode enviar mais de uma mensagem se fizer sentido.`

// Histórico por número de telefone
const histories = new Map<string, { role: string; parts: any[] }[]>()

export async function runAgent(phone: string, incomingText: string): Promise<void> {
  const model = genai.getGenerativeModel({
    model: 'gemini-flash-lite-latest',
    systemInstruction: SYSTEM_INSTRUCTION,
    tools: TOOLS,
    toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
  })

  const history = histories.get(phone) ?? []

  const chat = model.startChat({ history })

  // Executa o loop do agente
  let response = await chat.sendMessage(incomingText)

  for (let turn = 0; turn < 5; turn++) {
    const candidate = response.response.candidates?.[0]
    if (!candidate) break

    const parts = candidate.content.parts
    const toolCalls = parts.filter((p: any) => p.functionCall)

    if (toolCalls.length === 0) break

    // Executa cada tool call
    const toolResults = await Promise.all(
      toolCalls.map(async (part: any) => {
        const { name, args } = part.functionCall

        if (name === 'send_whatsapp_message') {
          await sendTextMessage(phone, args.text)
          return {
            functionResponse: {
              name,
              response: { success: true },
            },
          }
        }

        return {
          functionResponse: {
            name,
            response: { error: 'tool desconhecida' },
          },
        }
      })
    )

    // Devolve os resultados das tools ao agente
    response = await chat.sendMessage(toolResults)
  }

  // Persiste histórico atualizado
  const updatedHistory = await chat.getHistory()
  histories.set(phone, updatedHistory)
}
