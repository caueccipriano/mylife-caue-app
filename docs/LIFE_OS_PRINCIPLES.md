# EU Life OS — princípios de produto

O EU não deve virar mais um sistema que o usuário precisa administrar. Ele deve reduzir manutenção, handoffs e reentrada de informação.

## 1. Capture uma vez
A pessoa registra em linguagem natural, compartilha um link, envia algo do ChatGPT ou recebe algo por uma integração. O sistema interpreta e roteia. Evitar pedir que o mesmo dado seja categorizado, copiado ou sincronizado manualmente em vários lugares.

## 2. Uma fila de ação
Tudo que realmente pede ação deve convergir para uma única visão diária. Objetivos, projetos, retornos, agenda e inbox podem existir em visões próprias, mas o usuário não deve procurar em várias telas para descobrir o que fazer.

## 3. Hoje tem no máximo três focos
O sistema pode guardar centenas de coisas; a tela Hoje não deve mostrar centenas de coisas. Itens vencidos e próximos passos claros têm prioridade. O restante continua seguro no Sistema.

## 4. Dashboard é leitor; sistema é escritor
Painéis devem exigir o mínimo possível de manutenção. Sempre que for confiável, estado, progresso, datas, vínculos e sinais devem ser derivados dos registros e integrações existentes.

## 5. Fonte de verdade, não cópias
O EU deve referenciar e resumir fontes externas quando possível em vez de duplicar tudo. Ex.: calendário continua sendo calendário; Gmail continua sendo e-mail; o EU apresenta apenas o que muda uma decisão ou ação.

## 6. Automação progressiva
Primeiro um fluxo simples funciona manualmente. Depois automatizamos. Cada automação precisa ter fonte, regra, saída e falha visíveis. Nada de criar uma cadeia enorme e opaca de agentes antes de provar valor.

## 7. Automação não significa autonomia irrestrita
Leitura, classificação, resumo e sugestão podem ser automáticos. Ações externas sensíveis, exclusões, compras, envios e mudanças irreversíveis continuam exigindo aprovação explícita.

## 8. Local-first continua sendo a base
O arquivo pessoal permanece utilizável offline e sem backend mensal obrigatório. Integrações enriquecem o sistema, mas não podem tornar a vida do usuário inacessível quando uma API falhar.

## 9. Contexto deve sobreviver à sessão
Decisões de produto, estado dos projetos e arquitetura precisam existir em arquivos/versionamento legíveis para que uma nova sessão ou outro agente consiga continuar sem depender de memória informal.

## 10. IA que programa precisa ser auditável
Mudanças relevantes devem ter checkpoint Git, diff compreensível, testes e verificação antes de merge. Explicar a intenção e os riscos é parte do trabalho; “pareceu funcionar” não é critério de conclusão.

## Resultado desejado
O usuário deve sentir que o EU reduz trabalho administrativo. Se uma funcionalidade exige mais manutenção recorrente do que atenção que ela economiza, ela precisa ser simplificada, automatizada ou removida.
