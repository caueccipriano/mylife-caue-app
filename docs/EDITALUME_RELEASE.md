# Editalume · checkpoint de QA e pré-lançamento (29/09/2026)

Este documento separa a versão gratuita publicável de uma assinatura Premium que **ainda não está à venda**. Um teste automatizado aprovado não equivale a revisão humana em aparelhos reais nem a garantia de disponibilidade do PNCP.

## Gratuito — entrega implementada
- Pesquisa por palavra-chave, setor, cidade, modalidade, valor e prazo; padrão inclui os setores da amostra.
- Cartões com órgão, modalidade, prazo **informado**, valor e URL canônica do PNCP validada contra o ID do edital.
- Exportação CSV dos resultados filtrados; sanitização de valores com prefixos de fórmulas.
- Coleta amostral em SP e índice cumulativo deduplicado; distinguem registros observados nesta coleta e registros anteriores sem reconfirmação.
- Falhas HTTP e limitação da API não devem virar resultados fictícios ou alterar retroativamente datas de coleta bem-sucedida.
- Prévia local de alerta Pro **sem** cadastro, disparo ou pagamento.

## Gates técnicos automatizados
- [x] Build e testes Python de coleta/índice/Premium offline na CI.
- [x] Playwright Chromium: desktop 1440, tablet 768, mobile 390/320, filtros, preview, CSV, avisos, oficialidade dos links.
- [x] Falha total simulada: informar indisponibilidade, não renderizar cards, bloquear CSV.
- [x] Dados de apoio sem observação individual: nunca rotular como reconfirmados.
- [x] Tratamento de HTTP 429: interromper novas consultas e reportar cobertura parcial, preservando a última amostra válida.
- [ ] Smoke WebKit no CI (acompanhar o run do PR específico e marcar somente após aprovação).
- [ ] Validar o último deployment publicado e capturas de tela sem sobreposições.
- [ ] Revisão manual no Safari real do iPhone, Android e desktop, inclusive teclado e leitores de tela.

## Dependências externas e critérios comerciais
- [ ] Domínio Editalume separado de URLs que expõem o nome do proprietário; só depois retirar a regra `noindex,nofollow`.
- [ ] Confirmar e autorizar a identidade comercial/CIPRI Studios, caixa institucional, domínio de envio e SPF/DKIM/DMARC.
- [ ] Escolher projeto backend **separado do Fôlego**. Não colocar clientes ou credenciais no repositório público.
- [ ] Implementar login, perfis salvos, autorização por cliente (RLS), consentimento de e-mail, cancelamento, histórico/idempotência de envios e mecanismo de exclusão dos dados.
- [ ] Configurar provedor transacional e testar opt-in, desinscrição, falha de entrega e envio de lembretes apenas de prazos **confirmados**.
- [ ] Escolher provedor de cobrança e validar checkout, webhooks autenticados, provisionamento/cancelamento e reembolso. Não declarar o Premium ativo antes desse teste.
- [ ] Páginas comerciais e tratamento de dados revisados; não alegar que a base cobre todas as licitações ou garante contratos.
- [ ] Primeiro piloto de prospecção: endereços institucionais confirmados, pertinência, mensagens personalizadas e revisão humana antes de enviar. Nenhum disparo automático em massa.

## Critério para liberar a assinatura
A assinatura só pode ser anunciada após o backend privado, cobrança e e-mail estarem operacionais e testados ponta a ponta com usuários fictícios, sem misturar dados de aplicações existentes. Até lá, o site permanece gratuito com uma **demonstração** da ideia Premium.

## Limites da fonte
Os dados vêm de consultas públicas amostrais do PNCP; a API pode atrasar ou limitar requisições. O registro oficial, seus anexos e a situação atual do edital sempre prevalecem. A base nunca deve exibir um registro antigo como se tivesse sido validado hoje apenas por continuar com prazo futuro.
