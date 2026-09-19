import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getRecord, listRecords, saveRecord } from './storage'
import { decodeStarterPack, recordFromStarterItem } from './starterPack'
import { BrandTop, Tag } from './v2Ui'

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
        const existingRecords = await listRecords()
        const normalizedExisting = new Set(existingRecords.map((record) =>
          [record.text.trim().toLowerCase(), record.type.trim().toLowerCase(), record.area.trim().toLowerCase()].join('::'),
        ))
        let imported = 0

        for (const item of pack.items) {
          const record = recordFromStarterItem(pack, item)
          const existingById = await getRecord(record.id)
          const semanticKey = [record.text.trim().toLowerCase(), record.type.trim().toLowerCase(), record.area.trim().toLowerCase()].join('::')
          if (existingById || normalizedExisting.has(semanticKey)) continue
          await saveRecord(record)
          normalizedExisting.add(semanticKey)
          imported += 1
        }

        if (!active) return

        setCount(imported)
        setMessage(imported
          ? imported + (imported === 1 ? ' registro entrou no EU.' : ' registros entraram no EU.')
          : 'Esse pacote já estava no seu EU.')
        setState('done')
        window.dispatchEvent(new Event('eu-record-saved'))

        window.setTimeout(() => {
          if (active) navigate('/', { replace: true })
        }, 1200)
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
        <span>{state === 'done' ? '✓' : state === 'error' ? '!' : '↻'}</span>
        <h1>{state === 'done' ? 'Seu EU ganhou contexto.' : state === 'error' ? 'Algo não entrou.' : 'Montando seu EU.'}</h1>
        <p>{message}</p>
        {state === 'done' && <small>{count ? 'Você vai para Hoje automaticamente.' : 'Nada foi duplicado.'}</small>}
        {state === 'error' && <button onClick={() => navigate('/', { replace: true })}>Voltar ao EU</button>}
      </section>
    </div>
  )
}
