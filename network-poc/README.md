# Network Browser POC

POC isolado para testar Vercel Sandbox + agent-browser sem alterar o app EU.

## Objetivo
- validar `/api/ping`
- validar Chromium remoto em `/api/browser-test`
- só depois testar acesso ao LinkedIn
- não armazenar senha do LinkedIn
- eventual convite: somente conexão, sem mensagem
- interromper em CAPTCHA, verificação, limite ou aviso da plataforma

## Deploy
Importar a branch `network-browser-poc` no Vercel usando Root Directory `network-poc`.
