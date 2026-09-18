# EU

**EU** é um arquivo vivo pessoal: o lugar onde a vida é organizada, entendida, registrada, encontrada e acompanhada.

Não é um gerenciador de tarefas, agenda ou dashboard de produtividade.

## Produto

O app oferece cinco perspectivas integradas sobre a mesma vida:

- **Agora** — situação atual, assuntos em foco e registros recentes.
- **Áreas** — categorias permanentes da vida.
- **Projetos** — iniciativas com início, fim ou meta clara.
- **Arquivo** — memória pesquisável de tudo que foi registrado.
- **Eu** — dossiê pessoal vivo e linha do tempo.

O coração da experiência é o botão **Registrar**: texto, foto, link, documento ou áudio entram primeiro como um registro único e depois são interpretados e vinculados.

## Direção visual

Design editorial, arquitetônico e silencioso.

| Token | Cor |
| --- | --- |
| Areia | `#D3C7AD` |
| Azul | `#28374A` |
| Terra | `#754437` |
| Oliva | `#6B6751` |
| Papel | `#F5F1E8` |

Títulos editoriais serifados, corpo sans-serif limpo, bordas finas, bastante espaço vazio e quase nenhuma decoração gratuita.

## Stack

- React + TypeScript + Vite
- PWA mobile-first, otimizado para iPhone
- React Router
- **IndexedDB local-first** para persistência
- Service Worker para shell offline
- Backup manual em JSON, restaurável pelo próprio app

Não existe backend pago, conta obrigatória ou Supabase.

## Dados

O conteúdo pessoal fica no navegador instalado no aparelho. O EU oferece exportação de backup para que o arquivo possa ser salvo no app Arquivos/iCloud Drive e restaurado depois.

A camada de interpretação começa com regras locais. IA externa só entra futuramente se fizer sentido e sempre como recurso opcional, sem ser requisito para o funcionamento básico.

## Estado atual

Primeira fundação funcional: navegação, páginas principais, Registrar, persistência local em IndexedDB, Arquivo conectado aos registros, backup/restauração e estrutura PWA.

---

Uso pessoal.
