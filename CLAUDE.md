# Facto Talk — Bot WhatsApp

Bot conversacional no WhatsApp para anotar pedidos, fazer agendamentos e atender clientes.

## Stack

- **Runtime:** Node.js + TypeScript
- **Servidor:** Fastify
- **WhatsApp API:** WhatsMiau Cloud v2 (Evolution API hospedado)
- **IA:** Claude API (Haiku 4.5) — ainda não integrado, estrutura pronta em `src/index.ts`
- **Tunnel local:** localtunnel (`npx localtunnel --port 3000`)

## Estrutura do Projeto

```
src/
  index.ts          # Servidor Fastify com webhook
  whatsapp.ts       # Cliente WhatsMiau (sendTextMessage)
  send-test.ts      # Script: envia mensagem de texto
  send-buttons.ts   # Script: envia mensagem com botões
```

## Comandos

```bash
npm run dev         # Sobe o servidor (porta 3000)
npx localtunnel --port 3000  # Expõe URL pública
npx tsx src/send-test.ts 5519998170609    # Envia texto
npx tsx src/send-buttons.ts 5519998170609 # Envia botões
```

## WhatsMiau

**Base URL:** `https://api.whatsmiau.dev`
**Instância:** `FactoTalk_d3c6f726`
**Auth:** header `apikey`

### Endpoints confirmados
- `POST /v2/message/sendText/:instance` — texto simples ✅
- `POST /v2/message/sendButtons/:instance` — botões (testado, enviou com sucesso)
- `POST /v2/webhook/set/:instance` — configura webhook
- `GET /v2/webhook/find/:instance` — consulta webhook atual
- `GET /v2/instance/fetchInstances` — lista instâncias

### Lições aprendidas
- A instância anterior tinha espaço no nome (`Facto Talk_d3c6f726`) e causava "instance not found" — a nova (`FactoTalk_d3c6f726`) funciona
- O endpoint correto usa `/v2/` (sem isso também falha)
- A API key fica no header `apikey` (não Bearer)
- O webhook via API (`/v2/webhook/set`) retorna a URL interna do WhatsMiau na resposta, mas o GET mostra a URL real configurada — a URL real só é atualizada pelo painel do dashboard
- O WhatsMiau Cloud às vezes tem instabilidade (timeout em `147.79.83.233`)

### Payload do webhook recebido
```json
{
  "event": "messages.upsert",
  "instance": "FactoTalk",
  "data": {
    "key": {
      "remoteJid": "5519998170609@s.whatsapp.net",
      "fromMe": false
    },
    "message": {
      "conversation": "texto da mensagem",
      "buttonsResponseMessage": {
        "selectedButtonId": "opt_in"
      }
    },
    "pushName": "Nome do contato"
  }
}
```

### Resposta de botão
O `selectedButtonId` fica em `data.message.buttonsResponseMessage.selectedButtonId`.

## Webhook Setup

1. Subir servidor: `npm run dev`
2. Criar tunnel: `npx localtunnel --port 3000` → copiar URL
3. Configurar no painel WhatsMiau ou via API:
   ```bash
   curl -X POST "https://api.whatsmiau.dev/v2/webhook/set/FactoTalk_d3c6f726" \
     -H "apikey: $WHATSMIAU_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://SUA-URL.loca.lt/webhook","enabled":true,"events":["MESSAGES_UPSERT","MESSAGES_UPDATE"]}'
   ```
4. **Atenção:** o localtunnel gera URL nova a cada restart — sempre atualizar no painel

## Variáveis de Ambiente (.env)

```
WHATSMIAU_API_KEY=00c348b3-217e-4d45-8b70-d0622a0c1c2c
WHATSMIAU_INSTANCE=FactoTalk_d3c6f726
WHATSMIAU_BASE_URL=https://api.whatsmiau.dev
ANTHROPIC_API_KEY=        # preencher quando integrar Claude
PORT=3000
```

## Números de Teste

- `5519998170609` — número principal de testes
- `5516991213333` — teste secundário
- `5517991199494` — teste secundário

## Próximos Passos

- [ ] Testar resposta automática dos botões (opt_in / opt_out) com webhook funcionando
- [ ] Testar outros tipos de mensagem (lista, enquete, localização, mídia)
- [ ] Integrar Claude API para bot conversacional
- [ ] Deploy em servidor com URL fixa (Railway, Render, Fly.io) para dispensar localtunnel
