# Facto Talk

Bot conversacional no WhatsApp para o Facto Insights. Recebe mensagens via webhook do WhatsMiau, processa com um agente Gemini (tool calling) e responde automaticamente.

## Arquitetura

```
WhatsApp → WhatsMiau → POST /webhook → Agente Gemini
                                            ↓ tool: send_whatsapp_message()
                                       WhatsMiau → WhatsApp
```

O agente decide quando e o que responder usando tool calling — não é um simples request/response. Novas tools (buscar cliente, ver compras, criar campanha) são adicionadas em `src/agent.ts`.

## Stack

- **Runtime:** Node.js 20 + TypeScript
- **Servidor:** Fastify
- **IA:** Gemini Flash Lite (`gemini-flash-lite-latest`) via `@google/generative-ai`
- **WhatsApp:** WhatsMiau Cloud v2 (Evolution API)

## Endpoints

### `POST /webhook`
Recebe eventos do WhatsMiau. Sem autenticação (chamado pelo WhatsMiau).
Registrado automaticamente na subida se `TALK_PUBLIC_URL` estiver definida.

### `POST /send-text`
Envia mensagem para qualquer número. Requer Bearer token.

```bash
curl -X POST https://factotalk.facto.ia.br/send-text \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"number":"5511999999999","text":"olá!"}'
```

## Variáveis de Ambiente

| Variável | Descrição |
|---|---|
| `WHATSMIAU_API_KEY` | API key do WhatsMiau |
| `WHATSMIAU_INSTANCE` | Nome da instância (ex: `FactoTalk_d3c6f726`) |
| `WHATSMIAU_BASE_URL` | Base URL do WhatsMiau |
| `GOOGLE_API_KEY` | API key do Google AI Studio |
| `TALK_PUBLIC_URL` | URL pública do servidor (ex: `https://factotalk.facto.ia.br`) |
| `TALK_API_TOKEN` | Token Bearer para o endpoint `/send-text` |
| `PORT` | Porta interna (padrão: `3000`) |

## Deploy (Produção)

Push para `master` → VPS detecta e faz `git pull + docker compose up -d` automaticamente.

**Após mudança de env vars no VPS:**
```bash
ssh facto "cd /opt/facto/apps/factotalk && docker compose up -d --force-recreate"
```

**VPS:** `187.77.52.105` (alias SSH: `facto`, user: `clawd`)
**Código:** `/opt/facto/apps/factotalk/`
**Container:** `facto-talk` → porta `3020`

## Dev Local

```bash
cp .env.example .env   # preencher variáveis
docker-compose up -d
docker logs -f facto-talk
```

## Estrutura

```
src/
  index.ts    # Servidor Fastify: /webhook + /send-text
  agent.ts    # Agente Gemini com tool calling e histórico por número
  whatsapp.ts # Cliente WhatsMiau (sendTextMessage)
```

## Adicionando Tools ao Agente

Em `src/agent.ts`, adicione a declaração em `TOOLS` e o handler no loop de execução:

```typescript
// 1. Declare a tool
{ name: 'buscar_cliente', description: '...', parameters: { ... } }

// 2. Execute no loop
if (name === 'buscar_cliente') {
  const dados = await factoInsightsApi.getCliente(args.telefone)
  return { functionResponse: { name, response: dados } }
}
```
