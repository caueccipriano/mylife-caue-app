# EU — arquitetura funcional inicial

## Princípio

O banco não deve espelhar a navegação. **Agora, Áreas, Projetos, Arquivo e Eu são perspectivas sobre os mesmos dados**, e não cinco silos.

O objeto de entrada universal é `record`. Tudo que entra pelo **Registrar** nasce como um registro bruto e imutável o suficiente para preservar o contexto original.

## Fluxo do Registrar

1. Cliente cria `record` com texto e anexos.
2. Backend persiste o original imediatamente.
3. Uma função server-side envia somente o necessário ao classificador.
4. O classificador retorna dados estruturados:
   - `kind`: memory | preference | milestone | decision | project_signal | reference | purchase | note
   - entidades: pessoas, lugares, objetos, marcas
   - datas e prazos
   - valores e moeda
   - área sugerida
   - projeto existente sugerido
   - intenção de criar novo projeto
   - confiança por campo
5. Regras determinísticas validam a saída.
6. O app cria vínculos derivados, sem destruir o original.
7. Se a confiança for baixa em algo importante, o app guarda como memória e deixa a revisão opcional para depois.

## Regra de ouro

A IA **classifica e sugere vínculos**; ela não apaga, sobrescreve nem inventa fatos pessoais silenciosamente.

## Entidades centrais

- `records`: entrada original.
- `areas`: contextos permanentes.
- `projects`: ciclos com objetivo.
- `record_links`: relações de um registro com área/projeto/pessoa/lugar.
- `entities`: pessoas, lugares, objetos e organizações mencionadas.
- `decisions`: decisões extraídas ou registradas.
- `documents`: metadados de anexos.
- `profile_facts`: fatos vivos que alimentam o dossiê Eu.
- `timeline_events`: marcos navegáveis no tempo.

## IA

A primeira implementação recomendada usa uma **Supabase Edge Function**. A chave do provedor de IA fica somente no servidor.

A saída deve obedecer JSON Schema fixo. O prompt de sistema deve instruir o classificador a preferir `memory` quando não houver sinal suficiente para uma estrutura mais específica.

## Privacidade

O app é de uso individual. RLS deve restringir toda linha ao próprio `auth.uid()`.

Arquivos privados ficam em bucket privado com URLs assinadas de curta duração.

Informações sensíveis não devem entrar em logs de aplicação.
