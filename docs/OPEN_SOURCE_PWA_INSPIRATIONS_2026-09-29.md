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
