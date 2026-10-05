import type { BridgeCard } from './integrations'

export type LifeOSPermission = 'read' | 'derive' | 'prepare' | 'confirm'

export type LifeOSSource = {
  id: string
  title: string
  role: string
  truthFor: string
  state: 'local' | 'connected' | 'stale' | 'planned'
  permissions: LifeOSPermission[]
  note: string
}

export function buildLifeOSSources(bridges: BridgeCard[]): LifeOSSource[] {
  const bridgeById = new Map(bridges.map((bridge) => [bridge.id, bridge]))
  const bridgeSource = (id: 'folego' | 'traco' | 'repertorio', title: string, role: string, truthFor: string): LifeOSSource => {
    const bridge = bridgeById.get(id)
    return {
      id,
      title,
      role,
      truthFor,
      state: bridge?.bridge ? (bridge.stale ? 'stale' : 'connected') : 'local',
      permissions: ['read', 'derive'],
      note: bridge?.bridge
        ? bridge.stale
          ? 'Há dados neste aparelho, mas o último resumo pode estar antigo.'
          : 'Resumo local disponível neste aparelho.'
        : 'A ponte existe no ecossistema, mas ainda não há resumo recebido neste aparelho.',
    }
  }

  return [
    {
      id: 'eu',
      title: 'EU',
      role: 'memória, contexto e orquestração',
      truthFor: 'registros, vínculos, decisões e continuidade',
      state: 'local',
      permissions: ['read', 'derive'],
      note: 'Fonte local-first. Continua funcionando offline.',
    },
    {
      id: 'folego',
      title: 'Dinheiro',
      role: 'módulo financeiro nativo do EU',
      truthFor: 'orçamento, caixa, lançamentos, cartões, dívidas, recorrências e metas',
      state: 'connected',
      permissions: ['read', 'derive', 'prepare', 'confirm'],
      note: 'Usa diretamente o backend financeiro existente. A experiência agora é nativa dentro do EU.',
    },
    bridgeSource('traco', 'Traço', 'rotina e performance', 'treinos e sinais de consistência'),
    bridgeSource('repertorio', 'Repertório', 'aprendizado', 'estudos, leituras e revisões'),
    {
      id: 'gmail',
      title: 'Gmail',
      role: 'comunicação',
      truthFor: 'mensagens, remetentes e threads',
      state: 'planned',
      permissions: ['read', 'derive', 'prepare', 'confirm'],
      note: 'Ainda não conectado ao PWA. Quando entrar, leitura e triagem podem ser automáticas; envio continua com confirmação.',
    },
    {
      id: 'calendar',
      title: 'Google Calendar',
      role: 'tempo e compromissos',
      truthFor: 'eventos, horários e conflitos',
      state: 'planned',
      permissions: ['read', 'derive', 'prepare', 'confirm'],
      note: 'Ainda não conectado ao PWA. O EU não deve inventar agenda a partir de memória.',
    },
    {
      id: 'github',
      title: 'GitHub',
      role: 'estado técnico dos projetos',
      truthFor: 'commits, PRs, issues e código',
      state: 'planned',
      permissions: ['read', 'derive', 'prepare', 'confirm'],
      note: 'Projetos de software devem usar o repositório como fonte de verdade técnica.',
    },
  ]
}

export const autonomyRules = [
  {
    id: 'auto',
    title: 'Pode fazer sozinho',
    detail: 'Classificar, resumir, conectar registros, gerar briefing, calcular visões derivadas e sugerir próximos passos.',
  },
  {
    id: 'prepare',
    title: 'Pode preparar',
    detail: 'Rascunhar e-mail, propor evento, montar resposta ou mudança em sistema externo — sem executar ainda.',
  },
  {
    id: 'confirm',
    title: 'Pergunta antes',
    detail: 'Enviar para terceiros, excluir, gastar dinheiro, reservar, assumir compromisso ou fazer algo difícil de desfazer.',
  },
] as const
