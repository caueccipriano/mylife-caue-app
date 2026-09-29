# Curadoria de PWAs e plano de adoção — 29/09/2026

**Status:** pesquisa e backlog de referências; **nenhum código externo integrado**, sem alteração de produção/assinatura/credenciais. Decisões de implementação devem respeitar o produto autoral, as licenças e os gates atuais de QA.

## 1. Catálogo para experimentar

| Projeto | Site / demo divulgado | Código | Uso / limite |
|---|---|---|---|
| Actual Budget | https://demo.actualbudget.org | https://github.com/actualbudget/actual | Demo pública; orçamento e reconciliação. MIT. |
| OpenLedger | https://ledger.kovina.org | https://github.com/sparshsam/openledger | Site divulgado mas acesso não confirmado nesta sessão; ideias de importação UX e sincronização. AGPL-3.0. |
| Granite | Sem demonstração pública confirmada; docs https://morrismorrison.github.io/granite/ | https://github.com/MorrisMorrison/granite | PWA que exige self-host; inspiração técnica. AGPL-3.0. |
| Ballast | https://ballast-sigma.vercel.app | https://github.com/N-O-P-E/Ballast | Demo divulgada mas acesso não confirmado nesta sessão. MIT. |
| Skola | https://skola.cards | https://github.com/h16nning/skola | PWA publicada; apenas UX como referência. AGPL-3.0. |
| simpleTracker | https://tracker.simplesuite.dev | https://github.com/simplesuite/simpletracker | Site divulgado mas acesso não confirmado nesta sessão. AGPL-3.0. |
| JobSync | https://demo.jobsync.ca | https://github.com/Gsync/jobsync | Demo contém dados fictícios; instalação própria para experiência real. MIT. |
| Sossoldi | https://rip-comm.github.io/sossoldi/ | https://github.com/RIP-Comm/sossoldi | Documentação, **não** demo PWA: app Flutter mobile/desktop. MIT. |
| Hamro Meditation Timer | https://timer.saman.com.np | https://github.com/thesamanshakya/meditation-timer | PWA publicada. MIT. |
| PNCP busca de editais | Nenhum deploy público confirmado | https://github.com/gustavorochaC/PNCP | Estudo arquitetural; sem LICENSE no repositório verificado; não copiar código. |
| Super Productivity | https://app.super-productivity.com | https://github.com/super-productivity/super-productivity | Web app público para uso pessoal e referências de foco. MIT. |
| Memos | https://demo.usememos.com | https://github.com/usememos/memos | Demo pública; UX de captura. MIT. |
| Karakeep | https://try.karakeep.app | https://github.com/karakeep-app/karakeep | Demo somente leitura; credenciais no README oficial; AGPL-3.0. |
| Excalidraw | https://excalidraw.com | https://github.com/excalidraw/excalidraw | PWA offline; verificar a licença do pacote exato e compatibilidade antes de integrar. |
| PairDrop | https://pairdrop.net | https://github.com/schlagmichdoch/PairDrop | PWA para uso pessoal, sem integração planejada. |
| VERT | https://vert.sh | https://github.com/VERT-sh/VERT | Ferramenta web de conversão; AGPL-3.0, sem integração planejada. |

Uma página carregada pelo crawler não comprova que o fluxo ou instalabilidade funciona no Safari iOS físico.

## 2. Plano por produto

### Fôlego — P0 operação e segurança; P1 patrimônio/orçamento
**Já existe:** issue #25 descreve Fôlego 360, reconciliação, cartões, orçamento, metas, comparações; issue/PR #49 registra correções recentes para preflight IA. **Não criar arquitetura paralela nem reimplementar o mesmo backlog.**
- [ ] P0: concluir teste autenticado da IA em iPhone, isolamento de usuários/espaços, limites, custos e gates de lançamento/QA antes de prometer IA para assinantes.
- [ ] P1: estudar Actual Budget para comportamento de orçamento, hierarquias, relatórios e reconciliação; aproveitar Sossoldi/Flutter para padrões de código e patrimônio com critérios de segurança.
- [ ] P1: UX de importação CSV com prévia, deduplicação e alertas usando ideias do OpenLedger sem copiar código AGPL; preservar decisões existentes sobre data/sinal ambíguos.
- [ ] QA: usar apenas dados sintéticos para testes automatizados; não migrar/importar dados reais sem permissão específica; não alterar preço R$9,90 atual, billing, Supabase de produção nem dados.

### Traço / V60 — P1 blocos de treino
**Já existe:** fila reordenável, treino A–E, carga/repetições, cronômetros, histórico, medidas e PWA offline. **Não duplicar recursos.**
- [ ] P1: avaliar planejamento de blocos de progressão (ex.: 4–8 semanas) e deload configurável; estudar Ballast (MIT) e comportamentos observados em Granite (AGPL, ideia apenas).
- [ ] P1: prever metas de progressão sem diagnóstico clínico ou resultados garantidos; atualizar sessão sem perder cargas, trocas e histórico antigo.
- [ ] QA: testes de migração de chaves legadas v60_*, offline, Safari e Android; sincronização opcional permanece um projeto separado.

### Repertório — P1 retenção e captura de conhecimento
**Já existe:** abas `review`, `study`, `saved`, `article`; conteúdo editorial e fluxos de leitura.
- [ ] P1: auditar primeiro as regras atuais de revisão para não duplicar funcionalidade.
- [ ] P1: prototipar algoritmo FSRS com biblioteca **MIT** https://github.com/open-spaced-repetition/dart-fsrs em Flutter; dados e agendamento locais, notificações opt-in e testes determinísticos.
- [ ] P2: nova fila `Ler depois` com URLs/tags/miniaturas, inspirada em Karakeep **somente no conceito**; não usar indexação de sites sem consentimento nem conteúdo protegido copiado.
- [ ] P2: mapas de conexões visuais. Como Excalidraw é React e o app é Flutter, começar com wireframe próprio, não embutir framework por padrão.

### ALINHA — P1 refinamento de práticas, não refazer a base
**Já existe em branch/PR #5:** temporizador e som ambiente local opcional; Spotify e rituais existentes. Verificar merge/deploy antes de afirmar que está no PWA principal.
- [ ] P1: estudar Hamro (MIT) para presets de duração, sinos de início/fim/intervalo e estatísticas opcionais sem gamificação punitiva.
- [ ] P1: apenas efeitos sonoros próprios ou com licença comprovada; testar autoplay e suspensão Safari iOS, backup de dados locais e manter a estética editorial definida.
- [ ] Não duplicar o temporizador ou sons que já estão em PR #5.

### EU — P1 captura rápida e arquivo vivo
**Já existe:** botão Registrar, registros multimodais, IndexedDB, arquivo pesquisável e backup. O objetivo NÃO é transformar o app em um gerenciador de tarefas.
- [ ] P1: investigar captura sem atrito e retorno a registros (Memos, MIT); referências de organização e busca do Karakeep apenas conceituais (AGPL).
- [ ] P1: captura de links com metadados seguros, vínculos entre registros e proteção contra conteúdo remoto inseguro; testar offline/backup/restauração.
- [ ] P2: eventual quadro de conexões/diagramas, sujeito à avaliação de peso e compatibilidade.

### Radar de carreira (produto futuro ou módulo separado)
- [ ] Referência JobSync (MIT): pipeline de candidaturas, CV por vaga, correspondência explicável e painel de IA opcional.
- [ ] Confirmar primeiro onde hospedar este produto, diferenças em relação ao EU e custos/licenciamento de fornecedores de vagas. Não criar importações nem envio automático a recrutadores sem gates de consentimento.

### Editalume — P0 cobertura real/infra antes de novas funções
**Local atual:** diretório `radar/` do repositório `mylife-caue-app`; rastreamento de release na issue #5 e PWA isolada PR #18.
- [ ] P0: continuar QA iPhone real, backend Supabase próprio com aprovação de custo, RLS multiusuário e verificação de cobertura multiestado real e declarada com dados do PNCP oficial.
- [ ] P1: estudar **somente o padrão funcional** de busca híbrida, cache, paginação e deduplicação do projeto PNCP sem licença detectada; implementação original, sem copiar seus arquivos.
- [ ] Não declarar cobertura nacional completa a partir de amostragem, nem ativar checkout ou disparar alertas a terceiros antes de consentimento, QA, billing e dados independentes.

## 3. Regras de adoção

1. **Research != implementation:** licenças e demos precisam ser validadas antes de copiar qualquer código. MIT exige manutenção de avisos; AGPL pode impor obrigações fortes de publicação do código em aplicações distribuídas/servidas; PNCP sem licença explícita não autoriza reaproveitar código.
2. Nenhuma inspiração justifica regressões de design, PWA, privacidade, back-end, custo, controles de acesso ou estabilidade.
3. Preferir microtarefas verificáveis: inventário do código existente → lacuna real → especificação → branch isolada → testes sintéticos → QA em dispositivo físico → aprovação comercial quando aplicável.
4. Não confundir sites públicos e demos de dados fictícios com produtos comerciais validados.
5. PairDrop, VERT e Super Productivity podem ser usados diretamente sem integração aos produtos neste momento.

## 4. Execução incremental — checkpoint 29/09/2026

**As alterações seguintes estão em PRs de revisão, NÃO necessariamente publicadas.**
Nenhum código AGPL ou do PNCP sem licença foi incorporado.

| Produto | Código implementado | Revisão | Gate restante |
|---|---|---|---|
| Repertório | Fila estável/finita para flashcards, nota consolidada por assunto e aquecimento sem remarcação indevida. 2 testes unitários. | https://github.com/caueccipriano/repertorio-app/pull/16 | CI Flutter passou; testar navegação mobile real e compatibilidade com PR editorial #14. FSRS completo segue em issue #15. |
| Traço | Sem duplicar fase/deload já existentes: histórico semanal legível por fase, sem volume inventado para sessões parciais, com suporte correto a exercícios sem carga e backups duplicados. 6 testes. | https://github.com/caueccipriano/v60-workout-app/pull/2 | CI da fase passou; conferir visual real mobile e cache offline antes de merge. |
| ALINHA | Manter tela ativa no estúdio de meditação em navegadores compatíveis, somente após toque em Play, com desligamento seguro ao pausar/sair. 3 testes. | https://github.com/caueccipriano/alinha-app/pull/6 | O primeiro CI aprovou testes, build, PWA e Playwright; falhou apenas no upload de capturas por falta de cota do GitHub. Upload agora é opcional e a nova execução está em andamento. Ainda depende de Safari real e da branch de experiências do PR #5. |
| EU | Colar link com toque explícito no Registrar, normalização segura e alerta de duplicidade. 3 testes. | https://github.com/caueccipriano/mylife-caue-app/pull/20 | CI aprovada; ainda depende de testes Safari. Não modifica o PWA independente do Editalume. |

**P0 intacto:** Fôlego deve concluir autenticação, IA, RLS/isolamento, qualidade do release e migração de PRs existentes antes de adotar motor financeiro externo. O Editalume deve validar cobertura multiestado real e segurança do backend antes de copiar ideias adicionais de busca. Não acrescentar escopo para mascarar bloqueadores.

**Próximos incrementos aprováveis por microtarefas:** protótipo FSRS migrável sem reprogramar históricos silenciosamente; presets/sinos originais no ALINHA somente após validar sua versão de estúdio; captura de links e retorno por contexto no EU; estudo de orçamento e patrimônio no Fôlego após gates de lançamento. Cada um necessita branch, testes sintéticos e revisão de licença.

## 5. Checkpoint de publicação e QA — 29/09/2026

Este checkpoint prevalece sobre o estado histórico da tabela 4, que registrava PRs ainda em revisão. O registro é rastreável e não representa aprovação de testes manuais em iPhone.

- **EU:** link local com colagem explicitamente solicitada, normalização segura e proteção contra duplicidade. PR [#20](https://github.com/caueccipriano/mylife-caue-app/pull/20) integrado à main. CI e [deploy EU](https://github.com/caueccipriano/mylife-caue-app/actions/runs/36627878986) aprovados. Conferir manualmente o Safari iOS.
- **Repertório:** hotfix de segurança contra reset de histórico PR [#17](https://github.com/caueccipriano/repertorio-app/pull/17), seguido pela sessão finita de revisões PR [#16](https://github.com/caueccipriano/repertorio-app/pull/16). Ambos integrados à main. [CI](https://github.com/caueccipriano/repertorio-app/actions/runs/36628003068) e [publicação Web](https://github.com/caueccipriano/repertorio-app/actions/runs/36628003004) aprovadas. O reset antigo **não** restaura histórico que já foi apagado; backups pré-existentes continuam necessários.
- **Traço:** resumo de fase semanal PR [#2](https://github.com/caueccipriano/v60-workout-app/pull/2) integrado à main. A primeira tentativa de deploy falhou por versões mistas dos assets; hotfix de versionamento PR [#3](https://github.com/caueccipriano/v60-workout-app/pull/3) integrou versionamento e QA de release. A action [Deploy Traço](https://github.com/caueccipriano/v60-workout-app/actions/runs/36628278923) confirmou publicação. Verificar UI real iPhone, service worker/caches e integridade dos registros locais depois da atualização.
- **Fôlego:** branch de análise local ilimitada PR [#54](https://github.com/caueccipriano/folego-app/pull/54) recebeu correção de isolamento de banners após troca de Auth via PR [#55](https://github.com/caueccipriano/folego-app/pull/55). Os sete workflows do PR #55 passaram, mas **essa branch não é a produção**. Manter bloqueio de release por teste autenticado em ambiente de staging, reconciliando a cadeia de PRs e o comportamento da IA online.
- **ALINHA:** PR filho [#6](https://github.com/caueccipriano/alinha-app/pull/6) inclui Screen Wake Lock opcional e ajuste de constelação mobile decorrente de regressão real de hit-testing no E2E. Aguardar o QA da revisão atual e o PR pai #5 antes de publicar. Safari físico e permissões Wake Lock não podem ser comprovados por Chromium simulado.
- **Editalume:** mudanças de infraestrutura, coleta nacional declaradamente amostral, formulário piloto e assinatura seguem **separadas** da curadoria de código aberto. Não copiar o PNCP sem licença, não prometer cobertura integral, não ativar envios a terceiros nem checkout antes dos gates da issue #5.

Critério para considerar o pacote inicial finalizado: integração segura e publicação verificadas dos incrementos de baixo risco; PRs bloqueados por staging, iPhone físico ou dependências comerciais permanecem explicitamente parciais, sem fingir sucesso.
