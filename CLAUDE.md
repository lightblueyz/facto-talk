# Facto Talk — Bot WhatsApp

Bot conversacional no WhatsApp para anotar pedidos, fazer agendamentos e atender clientes.

## Repositório

**https://github.com/lightblueyz/facto-talk**
Push access: conta `cucharo` (PAT em `/home/cucharo/projetos_rafael/facto_software_house/.env`)

## Stack

- **Runtime:** Node.js + TypeScript
- **Servidor:** Fastify
- **WhatsApp API:** WhatsMiau Cloud v2 (Evolution API hospedado)
- **IA:** Claude API (Haiku 4.5) — ainda não integrado, estrutura pronta em `src/index.ts`

## Deploy

**Produção:** `https://factotalk.facto.ia.br`
**VPS:** Hostinger, SSH alias `facto` (user `clawd`, IP `187.77.52.105`, key `~/.ssh/facto_vps`)
**Código no VPS:** `/opt/facto/apps/factotalk/`
**Container:** `facto-talk` porta `3020:3000`
**Orquestrador:** `docker compose` (v2, sem hífen) — o VPS não tem `docker-compose` v1

### Como o deploy funciona

Push para `master` no GitHub → o VPS detecta e faz pull + `docker compose up -d` automaticamente.

### Após qualquer alteração de env vars no VPS

```bash
ssh facto "cd /opt/facto/apps/factotalk && docker compose up -d"
```
(não use `docker restart` — não relê o `.env`)

### .env de produção

Fica em `/opt/facto/apps/factotalk/.env` (não vai para o git). Conteúdo atual:

```
WHATSMIAU_API_KEY=00c348b3-217e-4d45-8b70-d0622a0c1c2c
WHATSMIAU_INSTANCE=FactoTalk_d3c6f726
WHATSMIAU_BASE_URL=https://api.whatsmiau.dev
ANTHROPIC_API_KEY=
TALK_PUBLIC_URL=https://factotalk.facto.ia.br
TALK_API_TOKEN=facto-talk-secret-2026
PORT=3000
```

## Estrutura do Projeto

```
src/
  index.ts          # Servidor Fastify: POST /webhook + POST /send-text
  whatsapp.ts       # Cliente WhatsMiau (sendTextMessage)
  send-test.ts      # Script: envia mensagem de texto
  send-buttons.ts   # Script: envia mensagem com botões (opt_in / opt_out)
```

## Endpoints

### POST /send-text
Envia mensagem para qualquer número. Autenticado por Bearer token.

```bash
curl -X POST https://factotalk.facto.ia.br/send-text \
  -H "Authorization: Bearer facto-talk-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{"number":"5519998170609","text":"oi, Rafael"}'
```

- `number`: formato `55DDD9XXXXXXXX` (sem `+`, sem espaços)
- Retorna `{"ok":true,"result":{...}}` com status `sent` se OK

### POST /webhook
Recebe eventos do WhatsMiau. Não requer auth (chamado pelo WhatsMiau).
O webhook é **registrado automaticamente** na subida do servidor se `TALK_PUBLIC_URL` estiver definida.

## WhatsMiau

**Base URL:** `https://api.whatsmiau.dev`
**Instância:** `FactoTalk_d3c6f726`
**Auth:** header `apikey`

### Endpoints confirmados
- `POST /v2/message/sendText/:instance` — texto simples ✅
- `POST /v2/message/sendButtons/:instance` — botões ✅
- `POST /v2/webhook/set/:instance` — configura webhook (auto-registrado na subida)
- `GET /v2/webhook/find/:instance` — consulta webhook atual
- `GET /v2/instance/fetchInstances` — lista instâncias

### Lições aprendidas
- Instância sem espaço no nome: `FactoTalk_d3c6f726` (com espaço causa "instance not found")
- Endpoint correto usa `/v2/` obrigatório
- API key no header `apikey` (não Bearer)
- URL do webhook sem espaço no final (espaço vira `%20` e dá 404)

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

## Dev Local

```bash
cd /home/cucharo/projetos_rafael/facto_software_house/facto_talk_new
docker-compose up -d      # sobe na porta 3020
docker logs -f facto-talk # acompanha logs
```

O `.env` local está em `/home/cucharo/projetos_rafael/facto_software_house/facto_talk_new/.env`.
Para dev, `TALK_PUBLIC_URL` pode ficar vazio (webhook não será registrado, mas `/send-text` funciona normalmente).

### Atenção: bug do docker-compose v1

Se aparecer `KeyError: 'ContainerConfig'` ao fazer `up`, rodar:
```bash
docker ps -aq --filter "label=com.docker.compose.project=facto_talk_new" | xargs -r docker rm -f
docker network ls --filter "name=facto_talk_new" -q | xargs -r docker network rm
docker-compose up -d
```

## Números de Teste

- `5519998170609` — número principal de testes
- `5516991213333` — teste secundário
- `5517991199494` — teste secundário

## Próximos Passos

- [ ] Integrar Claude API (Haiku 4.5) para bot conversacional no `/webhook`
- [ ] Conectar com Facto Insights v2 (backend chama `/send-text` via `http://host.docker.internal:3020`)
- [ ] Testar outros tipos de mensagem (lista, enquete, localização, mídia)
