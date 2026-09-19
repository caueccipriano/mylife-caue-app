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
        <Tag tone="ink">CAIXA DO CHAT</Tag>
        <h1>Coisas que vieram<br />das nossas conversas.</h1>
        <p>Revise quando quiser. Nada daqui vira memória, objetivo ou acompanhamento até você confirmar.</p>
      </header>

      <SectionTitle eyebrow="AGUARDANDO" title={batches.length ? batches.length + (batches.length === 1 ? ' conversa' : ' conversas') : 'Tudo limpo'} />

      <div className="chat-inbox-batches">
        {batches.map((batch) => {
          const encoded = encodeURIComponent(JSON.stringify(batch.items))
          return (
            <article key={batch.id}>
              <div className="chat-batch-top">
                <div>
                  <Tag tone="ink">CHATGPT</Tag>
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
            <p>Nada esperando. Quando uma conversa daqui gerar algo útil, ela pode aparecer nesta caixa antes de entrar no seu arquivo.</p>
          </div>
        )}
      </div>
    </div>
  )
}
