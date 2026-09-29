# Editalume · Asaas Sandbox e comercialização responsável

Status: **integração técnica preparada, nenhuma conta Asaas conectada, nenhum pagamento habilitado.** O proprietário da conta deve efetuar o cadastro/KYC e cadastrar os segredos exclusivamente no painel do Supabase; nunca colocar credenciais no GitHub ou no formulário piloto.

## Plano
- Gratuito: pesquisa pública da amostra nacional, filtros por UF, links oficiais e exportação de página.
- Premium proposto: R$ 39,90/mês, a confirmar após entrevistas de clientes. Perfis, alertas e lembretes devem funcionar de ponta a ponta ANTES de cobrar.
- Canal inicial: seis convites personalizados da CIPRI Studios para um piloto gratuito com avaliação em /radar/avaliar.html; sem automações de disparo nem listas compradas.
- Recebimentos futuros: página hospedada pelo Asaas com Pix e cartão de crédito, nunca captura local de dados de cartão.

## Passo 1 — proprietário da conta (ainda pendente)
1. Abra https://sandbox.asaas.com e crie uma conta de TESTES em nome do titular que administrará o recebimento. Sandbox e Produção são contas independentes.
2. Gere uma **chave de API apenas de Sandbox** em Integrações no site do Asaas. Não envie chaves pelo ChatGPT ou e-mail.
3. Abra https://supabase.com/dashboard/project/jhxhbgprjqppzfrjdfvj/settings/functions e registre os seguintes Edge Function Secrets:
   - `ASAAS_MODE` = `sandbox`;
   - `ASAAS_SANDBOX_API_KEY` = sua chave **de Sandbox**, sem espaços;
   - `ASAAS_SANDBOX_WEBHOOK_TOKEN` = segredo aleatório exclusivo (mínimo de 32 caracteres), DIFERENTE da API Key;
4. Na conta Sandbox do Asaas, configure Webhook **com esse mesmo token** no cabeçalho `asaas-access-token`, apontando para:
   `https://jhxhbgprjqppzfrjdfvj.supabase.co/functions/v1/editalume-asaas-webhook`.
   Inscreva apenas eventos relevantes de cobranças; revise os detalhes no painel.
5. Revise no Asaas a taxa **efetiva da sua conta**, conta de recebimento, dados cadastrais e condições contratuais antes de criar a conta real.

A Edge Function é intencionalmente travada enquanto essas variáveis estiverem ausentes. Ela aceita SOMENTE Sandbox, valida o token, confirma pagamentos no servidor do Asaas e registra um evento mínimo e idempotente em banco privado. **Não cria cobranças nem ativa o Pro.**

## Passo 2 — homologação e go-live (dependente de cadastro)
- Cadastrar cliente fictício no Sandbox, testar Checkout hospedado em modo recorrente e confirmar o primeiro pagamento fictício.
- Testar duplicação de webhook, assinatura cancelada, estorno, atraso, reprocessamento e perda temporária de comunicação.
- Vincular cobrança a um usuário autenticado (nunca apenas a endereço de e-mail declarado) e implantar concessão/revogação de entitlement somente após a API confirmar o estado financeiro.
- Publicar contrato/termos, privacidade, política de reembolso e cancelamento; revisar requisitos tributários para a conta escolhida.
- Somente então criar conta **Produção** e uma chave separada, trocar configuração após revisão, testar uma cobrança de valor mínimo autorizada e ativar vendas explicitamente.

## Referências oficiais
- https://docs.asaas.com/docs/sandbox
- https://docs.asaas.com/docs/authentication
- https://docs.asaas.com/reference/criar-novo-checkout
- https://docs.asaas.com/reference/criar-nova-assinatura
- https://docs.asaas.com/docs/sobre-os-webhooks
- https://www.asaas.com/precos-e-taxas

**Regra:** nenhuma cobrança será gerada ou disparada como efeito de uma resposta ao formulário de avaliação; pedido de informações não equivale a consentimento para venda nem a contratação.
