# Network Browser POC

POC isolado na branch `network-browser-poc`; não altera o app EU em produção.

## Estado verificado
- O preview inicial do Vercel foi publicado e `/api/ping` respondeu `{"ok":true,"message":"pong"}`.
- O primeiro teste do Chromium não retornou antes do limite do cliente; seu sucesso não foi confirmado.
- A revisão nesta branch **não está automaticamente publicada** no preview anterior.

## Próximo diagnóstico (em ordem, sem custos de Browserbase/TinyFish)
1. Publicar esta branch no projeto `network-browser-poc`, com Root Directory `network-poc`.
2. Definir `NETWORK_POC_TOKEN` como segredo do projeto e manter Deployment Protection.
3. Chamar `POST /api/sandbox-smoke` com `x-network-poc-token`. O teste roda apenas `node -e` dentro de uma VM, sem instalar Chromium.
4. Se funcionar e a cota gratuita ainda estiver disponível, provisionar uma vez um snapshot Vercel Sandbox que inclua dependências de Chromium e `agent-browser`.
5. Definir `AGENT_BROWSER_SNAPSHOT_ID` e chamar `POST /api/browser-test` com o mesmo token. Usa o snapshot para visitar apenas `https://example.com`.

Os endpoints que criam Sandbox são protegidos e o snapshot impede reinstalações custosas a cada chamada. Nunca armazenar a senha do LinkedIn. Não automatizar convites sem um teste separado que respeite CAPTCHA, limites e regras do serviço; nunca enviar mensagens/notas.
