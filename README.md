# EU

**EU** é uma central pessoal para organizar contexto, dinheiro, decisões, projetos, memórias e sinais da vida em um único lugar.

A proposta não é virar um gerenciador de tarefas. O EU tenta reduzir ruído: mostra o que importa agora e mantém o restante acessível quando você quiser aprofundar.

## Experiência principal

A navegação é dividida em cinco áreas:

- **Hoje** — contexto atual, humor, prioridade adaptativa, registros recentes e o campo **Diga ao EU**.
- **Dinheiro** — o antigo FÔLEGO incorporado ao EU, usando o mesmo backend financeiro.
- **Central** — objetivos, projetos, agenda, dependências, revisões e sinais do Life OS.
- **Vida** — áreas pessoais, carreira, fases, capítulos, identidade e laboratório.
- **Memórias** — arquivo pesquisável, humor, coleções e histórico.

O botão **Registrar** continua sendo a entrada rápida para guardar algo sem precisar decidir antes onde aquilo pertence.

## Diga ao EU

O campo universal da Home recebe linguagem natural e encaminha o conteúdo para a ação adequada.

Exemplos:

- `gastei 82 de gasolina` → prepara um lançamento financeiro;
- `decidi estudar SQL` → prepara um registro;
- `buscar carro` → pesquisa no arquivo pessoal.

Ações com consequência, especialmente movimentações financeiras, continuam exigindo confirmação.

## Dinheiro / FÔLEGO

O FÔLEGO não é mais tratado como um app separado na experiência principal. A tela **Dinheiro** usa o mesmo Supabase financeiro para consultar e registrar snapshot de fôlego, contas, movimentações, orçamento, cartões, dívidas, recorrências e metas.

A autenticação do EU usa a mesma conta já utilizada pelo FÔLEGO.

## Dados e arquitetura

- React + TypeScript + Vite
- PWA mobile-first, otimizado para iPhone
- React Router
- IndexedDB/localStorage para registros e contexto local do EU
- Supabase para autenticação e dados financeiros
- Service Worker para o shell PWA
- Backup/restauração dos registros locais

O frontend utiliza apenas a chave pública/publishable do Supabase. O acesso aos dados financeiros deve permanecer protegido por autenticação e RLS no backend.

## Direção visual

A interface usa a identidade consolidada do EU/FÔLEGO: superfícies claras, azul estrutural, verde para Dinheiro, lilás para a Central, rosa para Memórias e conteúdo secundário recolhido para reduzir sensação de dashboard.

## Estado atual

**EU v55.1 — iPhone QA**

Passada visual pós-v54 baseada em QA real no iPhone. O release preserva todo o Living System e corrige a composição mobile antes do próximo ciclo de features:

- **Deep Routes 2.0:** páginas internas usam um shell visual mais consistente, sem dock principal e com densidade mobile reduzida.
- **Empty States inteligentes:** o EU deixa de preencher espaço com blocos vazios e passa a explicar quando o silêncio é normal ou qual ação pequena faz sentido.
- **Today Proactive + Morning/Evening:** a Home ganhou um ritmo diário que muda conforme horário, pendências, contexto financeiro e fechamento do dia.
- **One EU Actions:** conexões entre módulos podem virar um próximo passo acompanhado, sempre após confirmação.
- **Memory Intelligence:** Memórias detecta temas recorrentes, mudanças de presença por área e continuidade depois de decisões.
- **Design System Cleanup:** novos tokens canônicos de spacing, radius, superfície, tipografia e cor passam a orientar os novos componentes; CSS legado foi preservado por segurança até QA visual.
- **Performance/PWA:** rotas profundas são carregadas sob demanda, reduzindo o bundle inicial, e o fluxo Fresh Update da v44 continua ativo.
- **Personalização local:** o EU aprende, somente neste aparelho, quais conexões você abre ou ignora e usa isso como sinal leve de ordenação.
- **Private Sync / Backup:** o Sync Vault cifrado passa a atualizar automaticamente no aparelho; recuperação em outro aparelho continua via `.eubackup` AES-GCM protegido por senha, sem fingir que existe sync de nuvem onde não existe.

---

Uso pessoal.
