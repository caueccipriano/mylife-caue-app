# ChatGPT ↔ EU — fluxo pessoal

## Regra de uso

Depois de uma conversa que gere algo útil para a memória pessoal — decisão, preferência, marco, ideia, projeto, referência ou contexto — o ChatGPT pergunta:

> **Lançar no EU?**

O conteúdo só entra no EU depois da confirmação do usuário.

## Como funciona sem backend

O EU é local-first e não possui servidor de dados. Portanto o ChatGPT não grava diretamente no IndexedDB do iPhone.

Após a confirmação, o registro é estruturado com:

- texto;
- tipo;
- área;
- fonte `chatgpt`;
- data do lançamento no aparelho.

O app possui a rota local `#/capturar`, que recebe o conteúdo no fragmento da URL, mostra uma prévia e salva no IndexedDB somente após a ação do usuário.

Como o payload fica depois do caractere `#`, ele não faz parte da requisição HTTP enviada ao host.

## Princípio

**Conversar primeiro. Arquivar depois.**

O EU não deve transformar automaticamente toda fala em uma obrigação ou fato permanente. A confirmação evita ruído e preserva controle sobre a memória.
