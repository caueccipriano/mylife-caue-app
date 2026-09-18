import { FormEvent, useMemo, useState } from 'react'
import { saveRecord } from './storage'

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
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term))
}

function detectArea(value: string) {
  if (includesAny(value, ['trabalho', 'carreira', 'vaga', 'entrevista', 'currículo', 'curriculo', 'promoção', 'promocao', 'pleno', 'sênior', 'senior', 'salário', 'salario', 'power bi', 'sap', 'dados'])) return 'Carreira'
  if (includesAny(value, ['curso', 'faculdade', 'estudo', 'prova', 'idioma', 'aula'])) return 'Estudos'
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

  if (includesAny(value, ['gostei', 'curti', 'prefiro', 'amo', 'achei lindo', 'achei legal', 'quero lembrar desse'])) {
    return {
      kind: 'Gostei',
      area,
      title: input.slice(0, 72),
      detail: 'Preferência detectada. O EU vai usar isso como referência para escolhas futuras.',
    }
  }

  if (includesAny(value, ['andei pesquisando', 'estou pesquisando', 'tô pesquisando', 'to pesquisando', 'pesquisando pra comprar', 'pesquisando para comprar', 'de olho em', 'comparando opções', 'comparando opcoes'])) {
    return {
      kind: 'Pesquisa',
      area: area === 'Pessoal' ? 'Compras' : area,
      title: input.slice(0, 72),
      detail: 'Pesquisa em andamento detectada. Isso entra no seu radar para comparação e decisão depois.',
    }
  }

  if (includesAny(value, ['preciso fazer', 'tenho que', 'não posso esquecer', 'nao posso esquecer', 'lembrar de', 'preciso resolver', 'tenho de'])) {
    return {
      kind: 'Preciso fazer',
      area,
      title: input.slice(0, 72),
      detail: 'Pendência detectada. Ela fica visível como próximo movimento, sem transformar tudo em uma lista de tarefas.',
    }
  }

  if (includesAny(value, ['decidi', 'vou fazer', 'escolhi', 'fechei com', 'resolvi que'])) {
    return {
      kind: 'Decisão',
      area,
      title: input.slice(0, 72),
      detail: 'Decisão detectada e pronta para entrar no histórico da área.',
    }
  }

  if (includesAny(value, ['quero', 'meta', 'até ', 'objetivo']) && includesAny(value, ['comprar', 'mudar', 'conseguir', 'terminar', 'chegar', 'virar', 'fazer'])) {
    return {
      kind: 'Projeto',
      area,
      title: input.slice(0, 72),
      detail: 'Intenção com objetivo detectada. O EU vai tratar isso como algo que tem direção e evolução.',
    }
  }

  if (includesAny(value, ['comecei', 'terminei', 'concluí', 'conclui', 'entrei', 'saí', 'sai'])) {
    return {
      kind: 'Marco',
      area,
      title: input.slice(0, 72),
      detail: 'Marco temporal detectado e pronto para entrar na sua linha do tempo.',
    }
  }

  if (includesAny(value, ['ideia', 'pensei em', 'e se eu', 'seria legal'])) {
    return {
      kind: 'Ideia',
      area,
      title: input.slice(0, 72),
      detail: 'Ideia guardada sem compromisso. Ela pode virar projeto, decisão ou referência depois.',
    }
  }

  return {
    kind: 'Memória',
    area,
    title: input.slice(0, 72),
    detail: 'Registro livre. O EU guarda o contexto mesmo quando ele não precisa virar ação.',
  }
}

const quickStarts = [
  'Gostei de ',
  'Andei pesquisando pra comprar ',
  'Preciso fazer ',
  'Na carreira, quero ',
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
      await saveRecord({
        id: crypto.randomUUID(),
        text: value.trim(),
        type: interpretation.kind,
        area: interpretation.area,
        createdAt: new Date().toISOString(),
        source: 'manual',
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
              placeholder="Ex.: gostei muito daquele relógio, andei pesquisando um carro, preciso atualizar meu currículo..."
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
            <button className="primary-button full" onClick={close}>Concluir</button>
          </div>
        )}
      </section>
    </div>
  )
}
