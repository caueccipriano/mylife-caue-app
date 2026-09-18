import { FormEvent, useMemo, useState } from 'react'

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

function interpret(input: string): Interpretation {
  const value = input.toLowerCase()

  if (value.includes('quero') && (value.includes('até') || value.includes('meta') || value.includes('comprar'))) {
    return {
      kind: 'Projeto',
      area: value.includes('carro') || value.includes('comprar') ? 'Compras' : 'Pessoal',
      title: input.slice(0, 64),
      detail: 'Intenção com meta detectada. Datas, valores e entidades serão estruturados na camada de IA.',
    }
  }

  if (value.includes('gostei') || value.includes('prefiro') || value.includes('amo')) {
    return {
      kind: 'Preferência',
      area: 'Pessoal',
      title: input.slice(0, 64),
      detail: 'Preferência pessoal detectada e pronta para ser recuperada no Arquivo.',
    }
  }

  if (value.includes('comecei') || value.includes('terminei') || value.includes('concluí')) {
    return {
      kind: 'Marco',
      area: value.includes('curso') || value.includes('estudo') ? 'Estudos' : 'Pessoal',
      title: input.slice(0, 64),
      detail: 'Evento temporal detectado e pronto para entrar na linha do tempo.',
    }
  }

  return {
    kind: 'Memória',
    area: 'Pessoal',
    title: input.slice(0, 64),
    detail: 'Registro livre. Nem tudo precisa virar tarefa, meta ou projeto.',
  }
}

export default function RegisterSheet({ open, onClose, onSaved }: Props) {
  const [value, setValue] = useState('')
  const [saved, setSaved] = useState<Interpretation | null>(null)
  const interpretation = useMemo(() => (value.trim() ? interpret(value.trim()) : null), [value])

  if (!open) return null

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!value.trim() || !interpretation) return

    const current = JSON.parse(localStorage.getItem('eu-records') || '[]')
    const item = {
      id: crypto.randomUUID(),
      text: value.trim(),
      type: interpretation.kind,
      area: interpretation.area,
      createdAt: new Date().toISOString(),
    }
    localStorage.setItem('eu-records', JSON.stringify([item, ...current].slice(0, 100)))
    setSaved(interpretation)
    onSaved()
  }

  function close() {
    setValue('')
    setSaved(null)
    onClose()
  }

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={close}>
      <section className="register-sheet" role="dialog" aria-modal="true" aria-labelledby="register-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <p className="eyebrow">REGISTRAR</p>
            <h2 id="register-title">O que aconteceu?</h2>
          </div>
          <button className="text-button" onClick={close}>Fechar</button>
        </div>

        {!saved ? (
          <form onSubmit={submit}>
            <textarea
              autoFocus
              className="capture-input"
              placeholder="Escreva do seu jeito. O EU organiza depois."
              value={value}
              onChange={(event) => setValue(event.target.value)}
              rows={6}
            />

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

            <button className="primary-button full" type="submit" disabled={!value.trim()}>
              Guardar no EU
            </button>
          </form>
        ) : (
          <div className="saved-state">
            <p className="eyebrow">GUARDADO</p>
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
