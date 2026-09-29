# Editalume · checkpoint de QA e pré-lançamento (29/09/2026)

Este documento separa a versão gratuita publicável de uma assinatura Premium que **ainda não está à venda**. Um teste automatizado aprovado não equivale a revisão humana em aparelhos reais nem a garantia de disponibilidade do PNCP.

## Estado nacional verificado (29/09/2026)
- Nova busca nacional disponível no site principal e conectada ao Supabase dedicado ao Editalume, separado do Fôlego.
- 27 UFs configuradas; em checkpoint verificável, **4 UFs tinham dados e 872 registros importados**. É um retrato temporal, não a cobertura final. A UI diferencia UFs sem coleta de UFs efetivamente recebidas.
- Coleta nacional rotativa via GitHub Actions (`radar-national.yml`), com OIDC efêmero validado no servidor pelo Edge Function `editalume-ingest`, sem segredo estático no repositório.
- A rotação coleta amostras limitadas; nunca declarar catálogo completo. Verifique o número corrente na tabela `editalume_uf_coverage`.
- Página de busca nacional mantém o acervo estadual legado como referência e a seleção de UF para navegar.
- Aviso excessivo do acervo legado reduzido a resumo com detalhes técnicos expansíveis e versionamento dos assets para contornar cache móvel.

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
- [x] Smoke WebKit no CI (confirmado na execução aprovada de QA pós-publicação da versão nacional).
- [x] Confirmar deploy nacional e aviso compacto publicado (GitHub Pages e QA CI aprovados).
- [ ] Revisão manual no Safari real do iPhone, Android e desktop, inclusive teclado e leitores de tela.

## Dependências externas e critérios comerciais
- [ ] Domínio Editalume separado de URLs que expõem o nome do proprietário; só depois retirar a regra `noindex,nofollow`.
- [ ] Confirmar e autorizar a identidade comercial/CIPRI Studios, caixa institucional, domínio de envio e SPF/DKIM/DMARC.
- [x] Projeto backend `Editalume` separado do Fôlego, com Supabase RLS e chave **publishable** pública apenas para leituras de licitações. Nunca publicar chaves de serviço.
- [x] Estrutura SQL de usuários, perfis com consentimento, planos/entitlements não editáveis pelo cliente, pesquisas salvas limitadas a 3 para Premium verificado, e fila de alertas deduplicada e privada.
- [x] RPC privada de **preparação** de alertas: somente service_role, consentimento explícito, plano válido/recentemente verificado e editais observados recentemente; testes de acesso e auditoria sem alertas de segurança.
- [ ] Conectar interface segura ao login e às pesquisas salvas; testar criação, alterações, cancelamento, recuperação e exclusão de dados em conta fictícia.
- [ ] Instalar provedor de e-mail; implementar remetente e cancelamento; testar envio, falha/retry, idempotência e desinscrição. A fila **não** significa que e-mails já sejam enviados.
- [ ] Configurar provedor transacional e testar opt-in, desinscrição, falha de entrega e envio de lembretes apenas de prazos **confirmados**.
- [ ] Escolher provedor de cobrança e validar checkout, webhooks autenticados, provisionamento/cancelamento e reembolso. Não declarar o Premium ativo antes desse teste.
- [ ] Páginas comerciais e tratamento de dados revisados; não alegar que a base cobre todas as licitações ou garante contratos.
- [ ] Primeiro piloto de prospecção: endereços institucionais confirmados, pertinência, mensagens personalizadas e revisão humana antes de enviar. Nenhum disparo automático em massa.

## Critério para liberar a assinatura
A assinatura só pode ser anunciada após o backend privado, cobrança e e-mail estarem operacionais e testados ponta a ponta com usuários fictícios, sem misturar dados de aplicações existentes. Até lá, o site permanece gratuito com uma **demonstração** da ideia Premium.

## Limites da fonte
Os dados vêm de consultas públicas amostrais do PNCP; a API pode atrasar ou limitar requisições. O registro oficial, seus anexos e a situação atual do edital sempre prevalecem. A base nunca deve exibir um registro antigo como se tivesse sido validado hoje apenas por continuar com prazo futuro.

## Monitoramento técnico e segurança
- A última validação pós-migração mostrou zero usuários, assinaturas, pesquisas ou alertas; nada foi enviado ou cobrado.
- Não ativar o processador da fila nem liberar compra antes de webhooks de pagamento autenticados e opt-in comprovado.
- A auditoria de segurança do Supabase retornou `lints: []` após retirada de token e extensão de rede criados em protótipo antigo que não era utilizado. Revisar periodicamente.
- A extensão pg_cron existe sem cron jobs; a coleta atual usa exclusivamente GitHub Actions + OIDC. Não criar rotina paralela que intensifique requisições ao PNCP.
