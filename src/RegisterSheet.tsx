import { type ChangeEvent, type FormEvent, useMemo, useRef, useState } from 'react'
import { nextFollowUpDate, saveRecord, updateRecord, type StoredAttachment } from './storage'
import { useRecords } from './appState'
import { detectSensitiveContent, findSimilarRecords } from './lifeModel'
import { haptic } from './securitySettings'

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
  someday?: boolean
}

const MAX_FILE_SIZE = 25 * 1024 * 1024
const MAX_ATTACHMENTS = 6

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

  if (includesAny(value, ['um dia eu quero', 'um dia quero', 'depois eu quero', 'mais pra frente', 'futuramente', 'no futuro', 'quem sabe um dia'])) {
    return {
      kind: 'Depois',
      area,
      title: input.slice(0, 88),
      detail: 'Algo do seu futuro, sem pressão. O EU guarda perto, mas não transforma em cobrança agora.',
      someday: true,
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
  'Gostei de ',
  'Comecei ',
  'Decidi ',
  'Preciso fazer ',
  'Saquei que ',
  'Andei pesquisando pra comprar ',
  'Um dia eu quero ',
  'Quero lembrar que ',
]

function humanSize(size?: number) {
  if (!size) return ''
  if (size < 1024 * 1024) return Math.max(1, Math.round(size / 1024)) + ' KB'
  return (size / (1024 * 1024)).toFixed(1) + ' MB'
}

function fileAttachment(file: File, kind: 'photo' | 'document'): StoredAttachment {
  return {
    id: crypto.randomUUID(),
    kind,
    name: file.name || (kind === 'photo' ? 'Foto' : 'Documento'),
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    blob: file,
  }
}

export default function RegisterSheet({ open, onClose, onSaved }: Props) {
  const records = useRecords()
  const [value, setValue] = useState('')
  const [saved, setSaved] = useState<Interpretation | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [attachments, setAttachments] = useState<StoredAttachment[]>([])
  const [showLink, setShowLink] = useState(false)
  const [linkValue, setLinkValue] = useState('')
  const [recording, setRecording] = useState(false)
  const [whyItMatters, setWhyItMatters] = useState('')
  const [forcePrivate, setForcePrivate] = useState(false)
  const [connectId, setConnectId] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  const fallbackText = attachments[0]?.kind === 'link'
    ? attachments[0]?.url || 'Link salvo'
    : attachments[0]?.name || ''
  const interpretation = useMemo(
    () => value.trim() || fallbackText ? interpret(value.trim() || fallbackText) : null,
    [value, fallbackText],
  )
  const similar = useMemo(
    () => value.trim().length >= 10 ? findSimilarRecords(records, value.trim()) : [],
    [records, value],
  )
  const sensitive = useMemo(() => detectSensitiveContent(value), [value])

  if (!open) return null

  function addFiles(event: ChangeEvent<HTMLInputElement>, kind: 'photo' | 'document') {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return

    const next: StoredAttachment[] = []
    let rejected = false

    for (const file of files) {
      if (attachments.length + next.length >= MAX_ATTACHMENTS || file.size > MAX_FILE_SIZE) {
        rejected = true
        continue
      }

      if (kind === 'photo' && !file.type.startsWith('image/')) {
        rejected = true
        continue
      }

      next.push(fileAttachment(file, kind))
    }

    setAttachments((current) => [...current, ...next])
    setError(rejected ? 'Alguns anexos foram ignorados. Limite: 6 anexos e 25 MB por arquivo.' : '')
  }

  function addLink() {
    const raw = linkValue.trim()
    if (!raw) return

    if (attachments.length >= MAX_ATTACHMENTS) {
      setError('Você já atingiu o limite de 6 anexos.')
      return
    }

    try {
      const url = new URL(raw.includes('://') ? raw : 'https://' + raw)
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('unsupported protocol')
      }
      setAttachments((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          kind: 'link',
          name: url.hostname.replace(/^www\./, ''),
          url: url.toString(),
        },
      ])
      setLinkValue('')
      setShowLink(false)
      setError('')
    } catch {
      setError('Esse link não parece válido.')
    }
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((item) => item.id !== id))
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop()
      setRecording(false)
      return
    }

    if (attachments.length >= MAX_ATTACHMENTS) {
      setError('Você já atingiu o limite de 6 anexos.')
      return
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('A gravação de áudio não está disponível neste navegador.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      streamRef.current = stream
      recorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/mp4' })
        if (blob.size) {
          setAttachments((current) => [
            ...current,
            {
              id: crypto.randomUUID(),
              kind: 'audio',
              name: 'Áudio ' + new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date()),
              mimeType: blob.type,
              size: blob.size,
              blob,
            },
          ])
        }
        chunksRef.current = []
        stopStream()
      }

      recorder.start()
      setRecording(true)
      setError('')
    } catch {
      stopStream()
      setError('Não consegui acessar o microfone. Verifique a permissão do Safari.')
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if ((!value.trim() && !attachments.length) || !interpretation || saving || recording) return

    setSaving(true)
    setError('')

    try {
      const now = new Date()
      const id = crypto.randomUUID()
      await saveRecord({
        id,
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
        someday: interpretation.someday,
        whyItMatters: whyItMatters.trim() || undefined,
        private: forcePrivate || undefined,
        relatedIds: connectId ? [connectId] : [],
        attachments,
      })

      if (connectId) {
        const related = records.find((record) => record.id === connectId)
        if (related) {
          await updateRecord(connectId, {
            relatedIds: [...new Set([...(related.relatedIds ?? []), id])],
          })
        }
      }

      haptic('success')
      setSavedId(id)
      setSaved(interpretation)
      onSaved()
    } catch {
      setError('Não consegui guardar esse registro no aparelho. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function quickAfterSave(patch: { favorite?: boolean; pinned?: boolean; status?: 'active'; followUpDays?: number; followUpAt?: string }) {
    if (!savedId) return
    await updateRecord(savedId, patch)
    window.dispatchEvent(new Event('eu-record-saved'))
    haptic('light')
  }

  function close() {
    if (recording) recorderRef.current?.stop()
    stopStream()
    setValue('')
    setSaved(null)
    setSavedId(null)
    setError('')
    setSaving(false)
    setAttachments([])
    setShowLink(false)
    setLinkValue('')
    setRecording(false)
    setWhyItMatters('')
    setForcePrivate(false)
    setConnectId(null)
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
              <label>
                Foto
                <input type="file" accept="image/*" multiple onChange={(event) => addFiles(event, 'photo')} />
              </label>
              <button type="button" onClick={() => setShowLink((current) => !current)}>Link</button>
              <label>
                Documento
                <input type="file" accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.csv,.ppt,.pptx" multiple onChange={(event) => addFiles(event, 'document')} />
              </label>
              <button type="button" className={recording ? 'recording' : ''} onClick={toggleRecording}>{recording ? 'Parar áudio' : 'Áudio'}</button>
            </div>

            {showLink && (
              <div className="link-capture">
                <input value={linkValue} onChange={(event) => setLinkValue(event.target.value)} placeholder="cole o link aqui" inputMode="url" />
                <button type="button" onClick={addLink}>Adicionar</button>
              </div>
            )}

            {attachments.length > 0 && (
              <div className="attachment-preview">
                {attachments.map((attachment) => (
                  <div key={attachment.id}>
                    <span>{attachment.kind === 'photo' ? '◫' : attachment.kind === 'audio' ? '◉' : attachment.kind === 'link' ? '↗' : '□'}</span>
                    <div>
                      <strong>{attachment.name}</strong>
                      <small>{attachment.url || humanSize(attachment.size)}</small>
                    </div>
                    <button type="button" onClick={() => removeAttachment(attachment.id)}>×</button>
                  </div>
                ))}
              </div>
            )}

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

            {sensitive.length > 0 && (
              <div className="sensitive-hint">
                <strong>Isso parece mais pessoal.</strong>
                <p>{sensitive.map((hint) => hint.label).join(' · ')}</p>
                <label>
                  <input type="checkbox" checked={forcePrivate} onChange={(event) => setForcePrivate(event.target.checked)} />
                  guardar como Privado
                </label>
              </div>
            )}

            {similar.length > 0 && (
              <div className="duplicate-hint">
                <span>VOCÊ JÁ ESTEVE AQUI ANTES</span>
                {similar.slice(0, 2).map(({ record, score }) => (
                  <button type="button" key={record.id} className={connectId === record.id ? 'active' : ''} onClick={() => setConnectId(connectId === record.id ? null : record.id)}>
                    <div>
                      <strong>{record.type} · {record.area}</strong>
                      <p>{record.text}</p>
                    </div>
                    <small>{connectId === record.id ? 'conectado ✓' : Math.round(score * 100) + '% parecido · conectar'}</small>
                  </button>
                ))}
              </div>
            )}

            {(interpretation?.track || interpretation?.someday || interpretation?.kind === 'Decisão') && (
              <div className="why-it-matters">
                <label htmlFor="why-it-matters">Por que isso importa? <span>opcional</span></label>
                <input
                  id="why-it-matters"
                  value={whyItMatters}
                  onChange={(event) => setWhyItMatters(event.target.value)}
                  placeholder="Ex.: porque quero migrar para dados sem perder minha base financeira"
                />
              </div>
            )}

            {error && <p className="inline-error">{error}</p>}

            <button className="primary-button full" type="submit" disabled={(!value.trim() && !attachments.length) || saving || recording}>
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
            <div className="saved-quick-actions">
              <button onClick={() => void quickAfterSave({ favorite: true })}>♡ guardar bem</button>
              <button onClick={() => void quickAfterSave({ pinned: true })}>⌖ fixar agora</button>
              {!saved.track && (
                <button onClick={() => void quickAfterSave({ status: 'active', followUpDays: 7, followUpAt: nextFollowUpDate(7) })}>↻ acompanhar</button>
              )}
            </div>
            <button className="primary-button full" onClick={close}>Concluir</button>
          </div>
        )}
      </section>
    </div>
  )
}
