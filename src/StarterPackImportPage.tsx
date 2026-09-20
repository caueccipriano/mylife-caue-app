import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getRecord, listRecords, saveRecord, updateRecord } from './storage'
import { decodeStarterPack, recordFromStarterItem } from './starterPack'
import { mergePersonalProfile } from './profile'
import { BrandTop, EuIcon, Tag } from './v2Ui'

function similarity(a: string, b: string) {
  const tokens = (value: string) => new Set(
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= 3),
  )

  const left = tokens(a)
  const right = tokens(b)
  if (!left.size || !right.size) return 0
  const intersection = [...left].filter((token) => right.has(token)).length
  const union = new Set([...left, ...right]).size
  return intersection / union
}

export default function StarterPackImportPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading')
  const [count, setCount] = useState(0)
  const [message, setMessage] = useState('Preparando seu EU…')

  useEffect(() => {
    let active = true

    async function run() {
      try {
        const params = new URLSearchParams(location.search)
        const encoded = params.get('pack')
        if (!encoded) throw new Error('Pacote ausente.')

        const pack = await decodeStarterPack(encoded)
        if (pack.profile) mergePersonalProfile(pack.profile)
        const existingRecords = await listRecords()
        const semanticKey = (record: { text: string; type: string; area: string }) =>
          [record.text.trim().toLowerCase(), record.type.trim().toLowerCase(), record.area.trim().toLowerCase()].join('::')
        const existingBySemantic = new Map(existingRecords.map((record) => [semanticKey(record), record]))
        let imported = 0
        let enriched = 0

        for (const item of pack.items) {
          const record = recordFromStarterItem(pack, item)
          const existingById = await getRecord(record.id)
          const exact = existingBySemantic.get(semanticKey(record))
          const close = existingRecords.find((candidate) =>
            candidate.type === record.type
            && candidate.area === record.area
            && similarity(candidate.text, record.text) >= .78,
          )
          const existing = existingById || exact || close

          if (existing) {
            if (record.attachments?.length) {
              const currentAttachments = existing.attachments ?? []
              const seenUrls = new Set(currentAttachments.map((attachment) => attachment.url).filter(Boolean))
              const additions = record.attachments.filter((attachment) => !attachment.url || !seenUrls.has(attachment.url))
              if (additions.length) {
                await updateRecord(existing.id, { attachments: [...currentAttachments, ...additions] })
                enriched += 1
              }
            }
            continue
          }

          await saveRecord(record)
          existingBySemantic.set(semanticKey(record), record)
          imported += 1
        }

        if (!active) return

        setCount(imported)
        setMessage(imported || enriched
          ? [
              imported ? imported + (imported === 1 ? ' registro novo' : ' registros novos') : '',
              enriched ? enriched + (enriched === 1 ? ' registro ganhou links' : ' registros ganharam links') : '',
            ].filter(Boolean).join(' · ') + '.'
          : pack.profile
            ? 'Seu perfil local foi atualizado sem duplicar registros.'
            : 'Esse pacote já estava no seu EU.')
        setState('done')
        window.dispatchEvent(new Event('eu-record-saved'))

        window.setTimeout(() => {
          if (active) navigate('/', { replace: true })
        }, 2400)
      } catch {
        if (!active) return
        setState('error')
        setMessage('Não consegui importar esse pacote.')
      }
    }

    void run()
    return () => {
      active = false
    }
  }, [location.search, navigate])

  return (
    <div className="v2-page starter-import-page">
      <BrandTop />
      <section className={'starter-import-card state-' + state}>
        <Tag tone={state === 'error' ? 'wine' : state === 'done' ? 'green' : 'cobalt'}>
          {state === 'loading' ? 'IMPORTANDO' : state === 'done' ? 'PRONTO' : 'ERRO'}
        </Tag>
        <span className="starter-state-icon"><EuIcon name={state === 'done' ? 'check' : state === 'error' ? 'x' : 'refresh'} /></span>
        <h1>{state === 'done' ? 'Seu EU ganhou contexto.' : state === 'error' ? 'Algo não entrou.' : 'Montando seu EU.'}</h1>
        <p>{message}</p>
        {state === 'done' && (
          <div className="starter-done-actions">
            <small>{count ? 'Você vai para Hoje automaticamente.' : 'Nada foi duplicado.'}</small>
            <button onClick={() => navigate('/', { replace: true })}>Ir para Hoje <EuIcon name="arrow-right" /></button>
          </div>
        )}
        {state === 'error' && <button onClick={() => navigate('/', { replace: true })}><EuIcon name="arrow-left" />Voltar ao EU</button>}
      </section>
    </div>
  )
}
