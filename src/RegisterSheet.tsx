import { FormEvent, useMemo, useState } from 'react'
import { nextFollowUpDate, saveRecord } from './storage'

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

type Interpretation = {
  kind: string
  area: string
  title: string
  detail: string
  track?: boolean
  followUpDays?: number
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term))
}

function detectArea(value: string) {
  if (includesAny(value, ['trabalho', 'carreira', 'vaga', 'entrevista', 'currículo', 'curriculo', 'promoção', 'promocao', 'pleno', 'sênior', 'senior', 'salário', 'salario', 'power bi', 'sap', 'dados'])) return 'Carreira'
  if (includesAny(value, ['curso', 'faculdade', 'estudo', 'prova', 'idioma', 'aula', 'certificação', 'certificacao'])) return 'Estudos'
  if (includesAny(value, ['carro', 'tênis', 'tenis', 'relógio', 'relogio', 'perfume', 'notebook', 'celular', 'comprar', 'preço', 'preco'])) return 'Compras'
  if (includesAny(value, ['viagem', 'viajar', 'hotel', 'passagem', 'cidade', 'roteiro'])) return 'Viagens'
  if (includesAny(value, ['dinheiro', 'guardar', 'investir', 'conta', 'cartão', 'cartao', 'parcela', 'orçamento', 'orcamento'])) return 'Dinheiro'
  if (includesAny(value, ['casa', 'apartamento', 'aluguel', 'móvel', 'movel'])) return 'Casa'
  if (includesAny(value, ['livro', 'série', 'serie', 'filme', 'restaurante', 'show', 'lazer'])) return 'Lazer'
  return 'Pessoal'
}

function interpret(input: string): Interpretation {
  const value = input.toLowerCase()
  const area = detectArea(value)

  const startedSomething = includesAny(value, ['comecei', 'iniciei', 'me matriculei', 'entrei no curso'])
  const courseLike = includesAny(value, ['curso', 'certificação', 'certificacao', 'formação', 'formacao', 'aulas'])

  if (startedSomething && courseLike) {
    return {
      kind: 'Curso',
      area: 'Estudos',
      title: input.slice(0, 88),
      detail: 'Começo detectado. O EU vai manter isso vivo e voltar a perguntar pelo andamento até você concluir, pausar ou desistir.',
      track: true,
      followUpDays: 7,
    }
  }

  if (includesAny(value, ['andei pesquisando', 'estou pesquisando', 'tô pesquisando', 'to pesquisando', 'pesquisando pra comprar', 'pesquisando para comprar', 'de olho em', 'comparando opções', 'comparando opcoes'])) {
    return {
      kind: 'Pesquisa',
      area: area === 'Pessoal' ? 'Compras' : area,
      title: input.slice(0, 88),
      detail: 'Pesquisa em andamento. O EU volta nisso depois para saber se virou decisão, compra ou se perdeu o sentido.',
      track: true,
      followUpDays: 7,
    }
  }

  if (includesAny(value, ['preciso fazer', 'tenho que', 'não posso esquecer', 'nao posso esquecer', 'lembrar de', 'preciso resolver', 'tenho de'])) {
    return {
      kind: 'Pendência',
      area,
      title: input.slice(0, 88),
      detail: 'Algo que precisa acontecer. O EU vai trazer isso de volta sem transformar sua vida numa lista infinita.',
      track: true,
      followUpDays: 3,
    }
  }

  if (includesAny(value, ['quero', 'meta', 'objetivo', 'pretendo']) && includesAny(value, ['comprar', 'mudar', 'conseguir', 'terminar', 'chegar', 'virar', 'fazer', 'aprender'])) {
    return {
      kind: area === 'Compras' ? 'Desejo' : 'Objetivo',
      area,
      title: input.slice(0, 88),
      detail: 'Direção futura detectada. O EU vai acompanhar se isso continua importante e qual foi o próximo movimento.',
      track: true,
      followUpDays: 14,
    }
  }

  if (includesAny(value, ['gostei', 'curti', 'prefiro', 'amo', 'achei lindo', 'achei legal', 'quero lembrar desse'])) {
    return {
      kind: area === 'Compras' ? 'Desejo' : 'Preferência',
      area,
      title: input.slice(0, 88),
      detail: 'Preferência detectada. Isso ajuda o EU a entender seu gosto e recuperar referências depois.',
    }
  }

  if (includesAny(value, ['decidi', 'vou fazer', 'escolhi', 'fechei com', 'resolvi que'])) {
    return {
      kind: 'Decisão',
      area,
      title: input.slice(0, 88),
      detail: 'Decisão detectada e pronta para entrar no histórico da área.',
    }
  }

  if (includesAny(value, ['saquei', 'percebi que', 'entendi que', 'insight', 'me dei conta'])) {
    return {
      kind: 'Insight',
      area,
      title: input.slice(0, 88),
      detail: 'Insight guardado. Ele também aparece em Descobertas para você conectar ideias ao longo do tempo.',
    }
  }

  if (startedSomething) {
    return {
      kind: 'Marco',
      area,
      title: input.slice(0, 88),
      detail: 'Um começo foi detectado e entrou na sua linha do tempo.',
      track: true,
      followUpDays: 14,
    }
  }

  if (includesAny(value, ['terminei', 'concluí', 'conclui', 'finalizei'])) {
    return {
      kind: 'Marco',
      area,
      title: input.slice(0, 88),
      detail: 'Conclusão detectada e pronta para entrar na sua linha do tempo.',
    }
  }

  if (includesAny(value, ['ideia', 'pensei em', 'e se eu', 'seria legal'])) {
    return {
      kind: 'Ideia',
      area,
      title: input.slice(0, 88),
      detail: 'Ideia guardada sem compromisso. Ela pode virar projeto, decisão ou descoberta depois.',
    }
  }

  return {
    kind: 'Memória',
    area,
    title: input.slice(0, 88),
    detail: 'Registro livre. Nem tudo precisa virar objetivo, tarefa ou projeto.',
  }
}

const quickStarts = [
  'Comecei um curso de ',
  'Gostei de ',
  'Andei pesquisando pra comprar ',
  'Preciso fazer ',
]

export default function RegisterSheet({ open, onClose, onSaved }: Props) {
  const [value, setValue] = useState('')
  const [saved, setSaved] = useState<Interpretation | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const interpretation = useMemo(() => (value.trim() ? interpret(value.trim()) : null), [value])

  if (!open) return null

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!value.trim() || !interpretation || saving) return

    setSaving(true)
    setError('')

    try {
      const now = new Date()
      await saveRecord({
        id: crypto.randomUUID(),
        text: value.trim(),
        type: interpretation.kind,
        area: interpretation.area,
        createdAt: now.toISOString(),
        source: 'manual',
        status: interpretation.track ? 'active' : undefined,
        followUpDays: interpretation.track ? interpretation.followUpDays : undefined,
        followUpAt: interpretation.track && interpretation.followUpDays
          ? nextFollowUpDate(interpretation.followUpDays, now)
          : undefined,
        startedAt: interpretation.track ? now.toISOString() : undefined,
      })

      setSaved(interpretation)
      onSaved()
    } catch {
      setError('Não consegui guardar esse registro no aparelho. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  function close() {
    setValue('')
    setSaved(null)
    setError('')
    setSaving(false)
    onClose()
  }

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={close}>
      <section className="register-sheet" role="dialog" aria-modal="true" aria-labelledby="register-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <p className="eyebrow">REGISTRAR</p>
            <h2 id="register-title">Me conta do seu jeito.</h2>
          </div>
          <button className="text-button" onClick={close}>Fechar</button>
        </div>

        {!saved ? (
          <form onSubmit={submit}>
            <textarea
              autoFocus
              className="capture-input"
              placeholder="Ex.: comecei um curso de SQL, gostei daquele relógio, andei pesquisando um carro..."
              value={value}
              onChange={(event) => setValue(event.target.value)}
              rows={6}
            />

            {!value.trim() && (
              <div className="quick-starts" aria-label="Exemplos de registro">
                {quickStarts.map((item) => (
                  <button type="button" key={item} onClick={() => setValue(item)}>{item}…</button>
                ))}
              </div>
            )}

            <div className="capture-tools" aria-label="Tipos de anexo">
              <button type="button">Foto</button>
              <button type="button">Link</button>
              <button type="button">Documento</button>
              <button type="button">Áudio</button>
            </div>

            {interpretation && (
              <div className="interpretation">
                <span>{interpretation.kind}</span>
                <strong>{interpretation.area}</strong>
                <p>{interpretation.detail}</p>
                {interpretation.track && (
                  <small className="followup-preview">↻ vou voltar nisso em {interpretation.followUpDays} dias</small>
                )}
              </div>
            )}

            {error && <p className="inline-error">{error}</p>}

            <button className="primary-button full" type="submit" disabled={!value.trim() || saving}>
              {saving ? 'Guardando…' : 'Guardar no EU'}
            </button>
          </form>
        ) : (
          <div className="saved-state">
            <p className="eyebrow">GUARDADO NO IPHONE</p>
            <h3>{saved.kind}</h3>
            <p>{saved.title}</p>
            <div className="saved-meta">{saved.area}</div>
            {saved.track && <p className="saved-followup">Eu volto nisso com você. Sem precisar lembrar sozinho.</p>}
            <button className="primary-button full" onClick={close}>Concluir</button>
          </div>
        )}
      </section>
    </div>
  )
}
