import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { listChatInbox, removeChatBatch, type ChatInboxBatch } from './chatInbox'
import { BrandTop, SectionTitle, Tag, typeTone } from './v2Ui'

export default function ChatInboxPage() {
  const [batches, setBatches] = useState<ChatInboxBatch[]>(() => listChatInbox())

  useEffect(() => {
    const refresh = () => setBatches(listChatInbox())
    window.addEventListener('eu-chat-inbox-updated', refresh)
    return () => window.removeEventListener('eu-chat-inbox-updated', refresh)
  }, [])

  function discard(id: string) {
    removeChatBatch(id)
  }

  return (
    <div className="v2-page chat-inbox-page">
      <BrandTop />
      <header className="v2-hero">
        <Tag tone="cobalt">ENTRADA</Tag>
        <h1>Coisas que chegaram<br />até o seu EU.</h1>
        <p>ChatGPT, compartilhamentos e outras pontes passam por aqui quando precisam da sua revisão antes de virar parte do arquivo.</p>
      </header>

      <SectionTitle eyebrow="AGUARDANDO" title={batches.length ? batches.length + (batches.length === 1 ? ' entrada' : ' entradas') : 'Tudo limpo'} />

      <div className="chat-inbox-batches">
        {batches.map((batch) => {
          const encoded = encodeURIComponent(JSON.stringify(batch.items))
          return (
            <article key={batch.id}>
              <div className="chat-batch-top">
                <div>
                  <Tag tone={batch.items[0]?.source === 'share' ? 'cobalt' : 'ink'}>{batch.items[0]?.source === 'share' ? 'COMPARTILHADO' : 'CHATGPT'}</Tag>
                  <span>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(batch.createdAt))}</span>
                </div>
                <strong>{batch.items.length} {batch.items.length === 1 ? 'coisa encontrada' : 'coisas encontradas'}</strong>
              </div>

              <div className="chat-batch-preview">
                {batch.items.slice(0, 3).map((item, index) => (
                  <div key={index}>
                    <Tag tone={typeTone(item.type || 'Memória')}>{item.type || 'Memória'}</Tag>
                    <p>{item.text}</p>
                  </div>
                ))}
                {batch.items.length > 3 && <small>+ {batch.items.length - 3} outras</small>}
              </div>

              <div className="chat-batch-actions">
                <NavLink to={'/capturar?itens=' + encoded}>Revisar e guardar</NavLink>
                <button onClick={() => discard(batch.id)}>Descartar</button>
              </div>
            </article>
          )
        })}

        {!batches.length && (
          <div className="soft-empty wide">
            <span>✓</span>
            <p>Nada esperando. Conversas, links e textos compartilhados podem aparecer aqui antes de entrar no seu arquivo.</p>
          </div>
        )}
      </div>
    </div>
  )
}
