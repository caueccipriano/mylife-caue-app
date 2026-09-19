# ChatGPT ↔ EU — fluxo pessoal

## Regra de uso

Depois de uma conversa que gere algo útil para a vida pessoal — decisão, preferência, desejo, curso, marco, insight, projeto, pesquisa, pendência ou contexto — o ChatGPT pergunta:

> **Lançar no EU?**

Nada entra automaticamente sem confirmação do usuário.

## Formas de envio

### 1. Registro único

Usar quando uma conversa gerou uma coisa principal.

Rota:

`#/capturar?texto=...&tipo=...&area=...`

Campos opcionais:

- `acompanhar=1` para itens vivos;
- `dias=7` para definir em quantos dias o EU deve voltar ao assunto.

Exemplo conceitual:

- texto: `Comecei um curso de SQL`
- tipo: `Curso`
- área: `Estudos`
- acompanhar: `1`
- dias: `7`

### 2. Fechar conversa

Quando uma conversa produz vários itens relevantes, usar o parâmetro `itens` com um array JSON codificado na URL.

Cada item aceita:

- `text`
- `type`
- `area`
- `track`
- `followUpDays`

O EU mostra todos os itens em uma tela de revisão e só salva o pacote depois de confirmação.

## Caixa de entrada do Chat

Os registros vindos daqui usam `source: chatgpt`.

Eles aparecem:

- no feed de Hoje;
- em Vida, quando alimentam uma área/plano;
- em Descobertas, quando são insight/ideia/preferência;
- em Memórias, com filtro **Do Chat**.

## Acompanhamentos vivos

Nem todo registro precisa de acompanhamento.

Devem ser acompanhados principalmente:

- cursos iniciados;
- pesquisas de compra;
- objetivos;
- projetos;
- pendências;
- começos que ainda pedem continuidade.

Um acompanhamento pode terminar como:

- concluído;
- pausado;
- abandonado;
- adiado para uma nova data.

## Como funciona sem backend

O EU é local-first e não possui servidor de dados pessoais.

O ChatGPT não escreve silenciosamente no IndexedDB do iPhone. Em vez disso:

1. estrutura o que vale guardar;
2. gera a captura;
3. o usuário abre a prévia no EU;
4. o usuário confirma;
5. o EU salva localmente.

O payload fica depois do `#` na URL do HashRouter, então o conteúdo não faz parte da requisição HTTP normal enviada ao host.

## Princípio

**Conversar primeiro. Interpretar. Confirmar. Arquivar. Acompanhar quando fizer sentido.**

O EU deve reduzir esforço, não transformar a vida em burocracia.
