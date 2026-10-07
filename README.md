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

**EU v42 — One EU**

Hoje, Central, Vida, Memórias e Brain passam a consumir a mesma camada de conexões entre registros e bridges. Compras podem conversar com Fôlego, estudo com carreira, decisões com movimentos posteriores e metas financeiras podem aparecer como contexto fora do Dinheiro sem duplicar sua fonte de verdade. O bridge do Fôlego agora publica também quantidade de metas ativas, meta principal e progresso resumido.

---

Uso pessoal.
