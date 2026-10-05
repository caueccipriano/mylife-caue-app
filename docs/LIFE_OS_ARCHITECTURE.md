# EU Life OS — arquitetura inspirada em assistentes pessoais reais

Este documento consolida padrões que aparecem repetidamente em sistemas pessoais de IA usados no dia a dia: memória persistente, contexto roteado, monitores proativos, autonomia limitada e dados verificáveis.

## 1. Camada de verdade
Tudo que pode causar decisão errada se estiver incorreto deve vir de uma fonte determinística.

Exemplos:
- saldos e orçamento: estrutura financeira / planilha / API
- datas e compromissos: calendário
- status de candidatura: fonte registrada + eventos
- prazo de projeto: campo estruturado
- progresso: evento ou atualização explícita, nunca inferência solta

A IA interpreta, resume e conecta. Ela não inventa o número de origem.

## 2. Memória temporal e editável
O EU deve lembrar:
- o que é verdade agora
- o que era verdade antes
- quando mudou
- por que mudou
- de onde veio a informação

Categorias mínimas:
- identidade
- preferência
- contexto
- decisão
- projeto
- objetivo
- pessoa
- financeiro
- saúde
- ferramenta
- rotina

Memória sensível recebe tratamento próprio. Correção e exclusão exigem fluxo explícito.

## 3. Bootstrap de contexto
Toda operação inteligente começa com um pacote curto, não com a vida inteira.

Bootstrap sugerido:
- data/hora
- identidade/preferências relevantes
- focos atuais
- projetos ativos
- decisões recentes
- dependências externas
- continuidades de ontem

O restante é carregado sob demanda.

## 4. Context Router
O sistema identifica a intenção e carrega apenas o contexto pertinente.

Exemplos:
- escrever e-mail -> voz + pessoa + projeto + thread
- planejar semana -> objetivos + agenda + pendências + energia
- analisar compra -> finanças + preferências + pesquisas
- retomar projeto -> handoff + decisões + arquivos + próximo passo

Evitar um prompt gigante permanente.

## 5. Handoff
Cada projeto deve ser retomável sem recontar sua história.

Um handoff ideal contém:
- estado atual
- último movimento
- decisões tomadas
- pendências
- bloqueios
- próximo passo
- arquivos/fontes relacionados
- última atualização

Esse handoff é atualizado quando algo relevante muda.

## 6. Scouts
Scouts observam fontes e geram sinais. Eles não decidem sozinhos que algo merece interromper o usuário.

Níveis:
- LOW: registrar; não interromper
- MEDIUM: incluir no briefing/radar
- HIGH: colocar no topo da atenção

Separar relevância de escalada:
- algo pode ser HIGH e ainda não exigir notificação imediata
- escalada fica reservada para prazo iminente, conflito real ou risco relevante

Todo Scout precisa explicar "por que apareceu".

## 7. Contextual Intelligence
O valor maior não vem de um sinal isolado, mas do cruzamento.

Exemplos:
- reunião amanhã + arquivo ainda não revisado -> sugerir preparação
- candidatura + e-mail novo da empresa -> ligar ao processo
- objetivo de carro + gasto inesperado -> recalcular trajetória financeira
- projeto parado + conversa recente relacionada -> sugerir retomar dali

Conexões devem citar as fontes internas usadas.

## 8. Bounded Autonomy
Três níveis:

### Pode fazer automaticamente e registrar
- classificar
- resumir
- criar vínculo entre registros
- atualizar índices derivados
- gerar briefing
- guardar memória não sensível quando a confiança for alta
- sugerir próximo passo

### Pode preparar, mas pede antes de executar
- criar evento externo
- enviar mensagem ou e-mail
- alterar compromisso
- mover/renomear arquivo externo
- atualizar sistema de terceiros

### Sempre exige confirmação explícita
- excluir dados
- compra/transação
- assinatura
- envio para terceiros
- reserva/RSVP
- mudança irreversível
- ação de segurança

## 9. Feedback loop
Planos não são estáticos.

Após uma ação, o EU pergunta ou infere com cautela:
- funcionou?
- foi pesado demais?
- mudou alguma preferência?
- o prazo continua realista?
- o próximo passo ainda faz sentido?

O plano evolui com experiência real.

## 10. Source map
Integrações precisam de um mapa claro:
- qual fonte serve para quê
- qual é a fonte principal
- o que é somente leitura
- o que pode ser escrito
- o que não deve ser usado
- o que fazer quando a fonte falhar

Exemplo:
- Google Calendar = compromissos
- Gmail = comunicação
- EU = memória, contexto, objetivos e orquestração
- FÔLEGO = verdade financeira detalhada
- GitHub = verdade de projetos de software

## 11. Resiliência
Toda integração precisa falhar sem quebrar o EU.

Regras:
- cache do último estado confiável
- mostrar quando a informação está velha
- não fingir atualização
- parar tentativas repetidas após falhas consecutivas
- permitir retry explícito
- manter funções locais disponíveis offline

## 12. Custos e inteligência em camadas
Nem toda tarefa precisa do modelo mais forte.

Arquitetura lógica:
- regras locais determinísticas: classificação simples e cálculos
- modelo leve: extração e triagem
- modelo forte: decisões, conflitos e síntese complexa

O produto deve conseguir trocar o motor sem alterar a experiência do usuário.

## 13. Regra de ouro
O EU é bem-sucedido quando reduz o número de coisas que Cauê precisa lembrar, copiar, atualizar e conferir manualmente.

Se uma funcionalidade cria manutenção recorrente, ela precisa justificar isso com uma economia maior de atenção.
