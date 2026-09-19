import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { emptyExpiredTrash, listTrash, permanentlyDeleteRecord, restoreRecord, type StoredRecord } from './storage'
import { BrandTop, Tag, formatShortDate, typeTone } from './v2Ui'

function daysLeft(record: StoredRecord) {
  if (!record.trashedAt) return 30
  const age = Math.floor((Date.now() - new Date(record.trashedAt).getTime()) / 86400000)
  return Math.max(0, 30 - age)
}

export default function TrashPage() {
  const [items, setItems] = useState<StoredRecord[]>([])
  const [message, setMessage] = useState('')

  async function refresh() {
    await emptyExpiredTrash(30)
    setItems(await listTrash())
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function restore(id: string) {
    await restoreRecord(id)
    setMessage('Registro restaurado.')
    window.dispatchEvent(new Event('eu-record-saved'))
    await refresh()
  }

  async function remove(id: string) {
    if (!window.confirm('Excluir permanentemente? Depois disso não dá para recuperar.')) return
    await permanentlyDeleteRecord(id)
    setMessage('Registro removido permanentemente.')
    window.dispatchEvent(new Event('eu-record-saved'))
    await refresh()
  }

  return (
    <div className="v2-page trash-page">
      <BrandTop />
      <NavLink className="back-v2" to="/seguranca">← Segurança</NavLink>

      <header className="v2-hero">
        <Tag tone="wine">LIXEIRA</Tag>
        <h1>Nada some<br />num susto.</h1>
        <p>Registros excluídos ficam aqui por até 30 dias antes de serem removidos definitivamente.</p>
      </header>

      {message && <p className="trash-message">{message}</p>}

      <div className="trash-list">
        {items.map((record) => (
          <article key={record.id}>
            <div className="trash-record-meta">
              <Tag tone={typeTone(record.type)}>{record.type}</Tag>
              <span>{record.area}</span>
              <small>{daysLeft(record)} dias restantes</small>
            </div>
            <h2>{record.private ? 'Registro privado' : record.text || 'Registro com anexo'}</h2>
            <p>criado em {formatShortDate(record.createdAt)}</p>
            <div>
              <button onClick={() => void restore(record.id)}>Restaurar</button>
              <button className="danger" onClick={() => void remove(record.id)}>Excluir pra sempre</button>
            </div>
          </article>
        ))}

        {!items.length && (
          <div className="soft-empty wide">
            <span>✓</span>
            <p>A lixeira está vazia.</p>
          </div>
        )}
      </div>
    </div>
  )
}
