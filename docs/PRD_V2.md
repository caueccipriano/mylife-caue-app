# EU v2 — PRD

## Visão

**O EU transforma o que você vive, pensa, deseja e decide em contexto para o seu futuro.**

O EU é um arquivo vivo pessoal. Não é um gerenciador de tarefas, um dashboard corporativo nem uma rede social.

Ele deve exigir o mínimo possível de organização manual.

## Navegação principal

### Hoje

A tela onde o EU conversa com o usuário.

Contém:

- saudação e data;
- check-in de humor opcional;
- Uma ideia pra hoje;
- itens que voltaram para acompanhamento;
- feed dos registros do dia;
- sinais resumidos dos apps integrados;
- recibos de coisas vindas do ChatGPT;
- ação global Registrar.

### Vida

A visão do que está tomando forma.

Contém:

- áreas permanentes;
- projetos, metas, cursos e outros itens vivos;
- desejos e pesquisas de compra;
- próximos movimentos;
- plano de carreira;
- plano de vida;
- sinais do Fôlego, Traço e Repertório.

### Descobertas

Curadoria pessoal, não biblioteca burocrática.

Contém:

- insights do próprio usuário;
- ideias;
- preferências relevantes;
- links/artigos salvos;
- sugestões derivadas dos assuntos recorrentes.

O Repertório continua responsável por aprofundar estudo. O EU guarda descoberta e contexto.

### Memórias

Busca e arquivo geral.

Deve permitir recuperar:

- registros;
- decisões;
- desejos;
- cursos;
- projetos;
- links;
- itens vindos do ChatGPT;
- humor;
- histórico.

## Registrar

Entrada universal para:

- texto;
- foto;
- link;
- documento;
- áudio.

O usuário escreve naturalmente.

O EU tenta inferir:

- tipo;
- área;
- necessidade de acompanhamento;
- intervalo de acompanhamento.

Tipos principais:

- Curso;
- Pesquisa;
- Pendência;
- Desejo;
- Objetivo;
- Preferência;
- Decisão;
- Insight;
- Marco;
- Ideia;
- Memória.

## Acompanhamentos vivos

Itens que pedem continuidade recebem:

- status;
- data de início;
- próxima revisão;
- intervalo;
- eventual conclusão.

Estados:

- active;
- completed;
- paused;
- abandoned.

Exemplos:

- curso iniciado → revisar em 7 dias;
- pesquisa de compra → revisar em 7 dias;
- preciso fazer → revisar em 3 dias;
- objetivo → revisar em 14 dias.

A cobrança deve ser gentil.

O usuário pode:

- concluir;
- lembrar depois;
- pausar;
- abandonar.

## Humor

Check-in rápido e opcional:

- animado;
- ok;
- cansado;
- pilhado.

Não é ferramenta clínica.

Serve para:

- alimentar Uma ideia pra hoje;
- enriquecer a linha do tempo;
- revelar padrões leves ao longo do tempo.

## ChatGPT ↔ EU

Princípio:

**Conversar primeiro. Interpretar. Confirmar. Arquivar. Acompanhar quando fizer sentido.**

O ChatGPT pode preparar:

- um item individual;
- um pacote ao fechar uma conversa.

Nada é salvo sem confirmação.

Itens vindos do ChatGPT usam `source: chatgpt`.

## Ecossistema

### Fôlego

Fornece sinais financeiros resumidos.

### Traço

Fornece sinais de treino, consistência e performance.

### Repertório

Fornece sinais de aprendizado e estudo.

O EU não copia os dashboards desses apps. Ele interpreta sinais para mostrar evolução no conjunto.

## Carreira

A área Carreira é estratégica.

Deve acompanhar:

- norte profissional;
- próximos 90 dias;
- horizonte de 12 meses;
- competências;
- lacunas;
- resultados/evidências;
- empresas e vagas de interesse;
- cursos relacionados;
- decisões profissionais.

O plano se recalibra com registros reais.

## Design

Paleta:

- Coral: `#D85A30`
- Verde: `#1D9E75`
- Âmbar: `#BA7517`
- Pink: `#993556`
- Fundo: off-white `#F6F2E9`

Tipografia:

- títulos: Fraunces;
- interface: Inter.

Direção:

- quente;
- viva;
- Gen Z;
- pessoal;
- limpa;
- acolhedora;
- sem aparência corporativa.

## Notificações

Poucas e justificadas:

- check-in se fizer sentido;
- acompanhamento vencido;
- item parado que voltou a ser relevante;
- descoberta realmente contextual;
- mudança relevante detectada em app integrado.

Não usar:

- streaks artificiais;
- “sentimos sua falta”;
- notificações de engajamento vazio.

Para PWA local sem backend, a primeira versão prioriza cobranças dentro do app. Push confiável com o app fechado exige infraestrutura específica de web push.

## Privacidade

Dados pessoais ficam no dispositivo sempre que possível.

Backup manual continua disponível.

O repositório não deve receber histórico pessoal real.

## Princípio de produto

**O EU deve reduzir o esforço de lembrar e organizar — nunca criar uma segunda vida para administrar.**
