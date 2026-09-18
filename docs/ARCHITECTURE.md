# EU — arquitetura local-first

## Princípio

**Agora, Áreas, Projetos, Arquivo e Eu são perspectivas sobre os mesmos dados**, não cinco bancos separados.

O app é pessoal, instalado como PWA no iPhone e deve funcionar sem conta, sem servidor próprio e sem assinatura de infraestrutura.

## Persistência

A fonte de verdade local é o **IndexedDB** do navegador.

O `localStorage` não é usado como banco principal. Existe apenas migração automática para registros antigos do primeiro protótipo.

Estrutura inicial:

- `records`: registros capturados pelo Registrar.
- futuramente `areas`: estado customizado das áreas.
- futuramente `projects`: projetos criados/alterados pelo usuário.
- futuramente `entities`: pessoas, lugares, objetos e organizações.
- futuramente `attachments`: metadados e blobs de foto, áudio e documento.
- futuramente `profileFacts`: fatos vivos que alimentam a tela Eu.

## Registrar

1. O usuário escreve ou anexa algo.
2. O original é salvo no aparelho imediatamente.
3. Um interpretador local sugere tipo e área.
4. O registro passa a aparecer em Recentes e Arquivo.
5. Estruturas derivadas podem evoluir depois sem apagar o original.

Regra de ouro: **guardar primeiro, interpretar depois**.

## Interpretação

A v1 usa regras locais leves para reconhecer sinais de:

- projeto/intenção;
- preferência;
- marco;
- memória livre.

Isso mantém o app 100% gratuito e offline.

Uma camada de IA pode ser adicionada depois como opção. Ela nunca deve ser necessária para abrir, buscar ou preservar os dados.

## Backup

Como os dados ficam no aparelho, o app oferece:

- **Criar backup** → arquivo JSON;
- **Restaurar backup** → importa um JSON do EU.

No iPhone, o arquivo pode ser guardado em Arquivos/iCloud Drive.

O backup deve evoluir junto com o schema e ter número de versão.

## PWA / iPhone

- `viewport-fit=cover`;
- uso de `env(safe-area-inset-*)`;
- navegação inferior respeitando home indicator;
- áreas tocáveis de pelo menos 44 px;
- `display: standalone`;
- shell offline via Service Worker;
- layout orientado primeiro a portrait;
- sem depender de recursos exclusivos de desktop.

## Limitação consciente

IndexedDB é armazenamento local do navegador. Apagar dados do site, remover o PWA ou certos cenários de limpeza do iOS podem apagar o conteúdo. Por isso o backup não é um extra: é parte do produto.
