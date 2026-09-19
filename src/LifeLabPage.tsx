import { type FormEvent, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { deriveChapters } from './lifeModel'
import { useBridges, useRecords } from './appState'
import { nextFollowUpDate, saveRecord, updateRecord, type StoredRecord } from './storage'
import {
  deriveChanges,
  deriveDecisionPattern,
  deriveLifeGraph,
  deriveObjects,
  derivePhaseTheme,
  derivePlaces,
  deriveRadar,
  downloadEditorialHtml,
  dueCapsules,
  futureCapsules,
} from './v3Life'
import { localSyncVaultMeta, syncVaultSecurityNote, writeLocalSyncVault } from './syncVault'
import { BrandTop, SectionTitle, Tag, formatShortDate, typeTone } from './v2Ui'

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value))
}

function graphPoint(index: number, total: number, weight: number) {
  const angle = (Math.PI * 2 * index) / Math.max(1, total) - Math.PI / 2
  const ring = index % 3
  const radius = 30 + ring * 17 + Math.min(10, weight * 2)
  return {
    x: 50 + Math.cos(angle) * radius,
    y: 50 + Math.sin(angle) * radius,
  }
}

export default function LifeLabPage() {
  const records = useRecords()
  const { bridges } = useBridges()
  const changes = useMemo(() => deriveChanges(records), [records])
  const radar = useMemo(() => deriveRadar(records), [records])
  const graph = useMemo(() => deriveLifeGraph(records), [records])
  const decisionPattern = useMemo(() => deriveDecisionPattern(records), [records])
  const places = useMemo(() => derivePlaces(records), [records])
  const objects = useMemo(() => deriveObjects(records), [records])
  const chapters = useMemo(() => deriveChapters(records), [records])
  const capsules = useMemo(() => futureCapsules(records), [records])
  const readyCapsules = useMemo(() => dueCapsules(records), [records])
  const phaseTone = useMemo(() => derivePhaseTheme(records), [records])

  const [capsuleText, setCapsuleText] = useState('')
  const [capsuleDate, setCapsuleDate] = useState('')
  const [decisionText, setDecisionText] = useState('')
  const [decisionExpectation, setDecisionExpectation] = useState('')
  const [confidence, setConfidence] = useState(70)
  const [phaseNote, setPhaseNote] = useState('')
  const [phaseChoice, setPhaseChoice] = useState('')
  const [message, setMessage] = useState('')
  const [vaultUpdatedAt, setVaultUpdatedAt] = useState(() => localSyncVaultMeta().updatedAt)

  async function createCapsule(event: FormEvent) {
    event.preventDefault()
    if (!capsuleText.trim() || !capsuleDate) return

    const revealAt = new Date(capsuleDate + 'T09:00:00').toISOString()
    await saveRecord({
      id: crypto.randomUUID(),
      text: capsuleText.trim(),
      type: 'Cápsula',
      area: 'Pessoal',
      createdAt: new Date().toISOString(),
      source: 'manual',
      revealAt,
      tags: ['cápsula', 'futuro'],
      private: false,
    })

    setCapsuleText('')
    setCapsuleDate('')
    setMessage('Cápsula fechada. O EU mostra o conteúdo quando chegar a data.')
    window.dispatchEvent(new Event('eu-record-saved'))
  }

  async function openCapsule(record: StoredRecord) {
    await updateRecord(record.id, { capsuleOpenedAt: new Date().toISOString() })
    setMessage('Cápsula aberta.')
    window.dispatchEvent(new Event('eu-record-saved'))
  }

  async function createDecision(event: FormEvent) {
    event.preventDefault()
    if (!decisionText.trim()) return

    const now = new Date()
    await saveRecord({
      id: crypto.randomUUID(),
      text: decisionText.trim(),
      type: 'Decisão',
      area: 'Pessoal',
      createdAt: now.toISOString(),
      source: 'manual',
      status: 'active',
      startedAt: now.toISOString(),
      followUpDays: 30,
      followUpAt: nextFollowUpDate(30, now),
      expectation: decisionExpectation.trim() || undefined,
      confidence,
      tags: ['decisão', 'decision-lab'],
    })

    setDecisionText('')
    setDecisionExpectation('')
    setConfidence(70)
    setMessage('Decisão entrou no Lab. O EU volta nela em cerca de 30 dias.')
    window.dispatchEvent(new Event('eu-record-saved'))
  }

  async function closePhase() {
    const chapter = chapters.find((item) => item.id === phaseChoice)
    if (!chapter) {
      setMessage('Escolha uma fase primeiro.')
      return
    }

    const now = new Date().toISOString()
    const recordIds = chapter.records.map((record) => record.id)

    for (const record of chapter.records) {
      await updateRecord(record.id, {
        chapterId: record.chapterId || chapter.label,
        phaseClosedAt: now,
        phaseColor: phaseTone,
      })
    }

    await saveRecord({
      id: crypto.randomUUID(),
      text: 'Fechei a fase: ' + chapter.label + (phaseNote.trim() ? '. ' + phaseNote.trim() : ''),
      type: 'Marco',
      area: chapter.records[0]?.area || 'Pessoal',
      createdAt: now,
      source: 'manual',
      status: 'completed',
      completedAt: now,
      chapterId: chapter.label,
      phaseClosedAt: now,
      phaseColor: phaseTone,
      relatedIds: recordIds,
      tags: ['fase', 'capítulo', chapter.label.toLowerCase()],
    })

    setPhaseChoice('')
    setPhaseNote('')
    setMessage('Fase fechada e transformada em capítulo.')
    window.dispatchEvent(new Event('eu-record-saved'))
  }

  async function refreshVault() {
    const updatedAt = await writeLocalSyncVault(records, bridges)
    setVaultUpdatedAt(updatedAt)
    setMessage('Sync Vault local atualizado.')
  }

  function exportLifeLab() {
    const selected = records
      .filter((record) => !record.private && !record.trashedAt)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(-80)

    downloadEditorialHtml(
      'EU · esta fase',
      'Uma edição do que mudou, ficou, virou decisão e ganhou história.',
      selected,
      'eu-esta-fase.html',
    )
  }

  const positions = graph.nodes.map((node, index) => ({ node, ...graphPoint(index, graph.nodes.length, node.weight) }))
  const byId = new Map(positions.map((item) => [item.node.id, item]))

  return (
    <div className="v2-page life-lab-page">
      <BrandTop />
      <NavLink className="back-v2" to="/vida">← Vida</NavLink>

      <header className="v2-hero lab-hero">
        <Tag tone="cobalt">EU LAB · V3</Tag>
        <h1>Ver a vida<br />por baixo da superfície.</h1>
        <p>Mudanças, padrões, decisões, objetos, lugares, fases e sinais dos seus outros apps — sem transformar sua vida numa planilha.</p>
      </header>

      {message && <p className="lab-message">{message}</p>}

      <section className="lab-block">
        <SectionTitle eyebrow="O QUE MUDOU?" title="Comparando agora com o período anterior" />
        <div className="change-grid">
          {changes.map((change) => (
            <article key={change.id} className={'change-card change-' + change.tone}>
              <Tag tone={change.tone}>{change.direction === 'up' ? '↑ CRESCEU' : change.direction === 'down' ? '↓ CAIU' : change.direction === 'new' ? '✦ NOVO' : change.direction === 'closed' ? '✓ FECHOU' : 'SINAL'}</Tag>
              <h3>{change.label}</h3>
              <p>{change.detail}</p>
            </article>
          ))}
          {!changes.length && <div className="soft-empty wide"><span>↔</span><p>A comparação fica mais interessante quando existem registros em pelo menos dois períodos diferentes.</p></div>}
        </div>
      </section>

      <section className="lab-block">
        <SectionTitle eyebrow="RADAR DA MENTE" title="O que está ocupando espaço agora" />
        <div className="mind-radar" aria-label="Radar visual de assuntos">
          {radar.map((topic, index) => {
            const size = Math.max(76, Math.min(168, 68 + topic.count * 17))
            return (
              <div
                key={topic.label}
                className={'mind-bubble bubble-' + (index % 8) + ' trend-' + topic.trend}
                style={{ width: size, height: size }}
                title={topic.label + ': ' + topic.count + ' aparições'}
              >
                <strong>#{topic.label}</strong>
                <span>{topic.trend === 'up' ? '↑' : topic.trend === 'down' ? '↓' : topic.trend === 'new' ? '✦' : '→'} {topic.count}</span>
              </div>
            )
          })}
          {!radar.length && <div className="soft-empty wide"><span>◌</span><p>O radar nasce conforme seus temas começam a se repetir.</p></div>}
        </div>
      </section>

      <section className="lab-block">
        <SectionTitle eyebrow="LIFE GRAPH" title="Como as coisas se conectam" />
        {graph.nodes.length ? (
          <div className="life-graph-wrap">
            <svg className="life-graph-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {graph.edges.map((edge, index) => {
                const from = byId.get(edge.from)
                const to = byId.get(edge.to)
                if (!from || !to) return null
                return <line key={index} x1={from.x} y1={from.y} x2={to.x} y2={to.y} strokeWidth={Math.min(1.2, .25 + edge.strength * .08)} />
              })}
            </svg>
            {positions.map(({ node, x, y }) => {
              const size = node.kind === 'area' ? 82 : node.kind === 'tag' ? 66 : 54
              return (
                <div
                  key={node.id}
                  className={'graph-node graph-' + node.kind + ' graph-tone-' + node.tone}
                  style={{ left: x + '%', top: y + '%', width: size, minHeight: size }}
                  title={node.label}
                >
                  {node.label}
                </div>
              )
            })}
          </div>
        ) : <div className="soft-empty wide"><span>⌘</span><p>As conexões aparecem quando áreas, tags e registros começam a se cruzar.</p></div>}
      </section>

      <section className="lab-block split-lab">
        <div className="lab-panel capsule-panel">
          <Tag tone="lilac">CÁPSULAS</Tag>
          <h2>Falar com você do futuro.</h2>
          <form onSubmit={createCapsule}>
            <textarea value={capsuleText} onChange={(event) => setCapsuleText(event.target.value)} rows={4} placeholder="O que você quer que o seu eu do futuro leia?" />
            <input type="date" value={capsuleDate} onChange={(event) => setCapsuleDate(event.target.value)} min={new Date().toISOString().slice(0, 10)} />
            <button type="submit">Fechar cápsula</button>
          </form>

          {readyCapsules.length > 0 && (
            <div className="capsule-stack ready">
              <small>PRONTAS PARA ABRIR</small>
              {readyCapsules.map((record) => (
                <article key={record.id}>
                  <strong>Cápsula de {formatShortDate(record.createdAt)}</strong>
                  <span>chegou a hora</span>
                  <button onClick={() => void openCapsule(record)}>Abrir agora</button>
                </article>
              ))}
            </div>
          )}

          {capsules.filter((record) => new Date(record.revealAt as string).getTime() > Date.now()).length > 0 && (
            <div className="capsule-stack">
              <small>FECHADAS</small>
              {capsules.filter((record) => new Date(record.revealAt as string).getTime() > Date.now()).slice(0, 5).map((record) => (
                <article key={record.id}>
                  <strong>Para {formatFullDate(record.revealAt as string)}</strong>
                  <span>conteúdo protegido pela data</span>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="lab-panel decision-panel">
          <Tag tone="wine">DECISION LAB</Tag>
          <h2>Registrar antes de saber o resultado.</h2>
          <form onSubmit={createDecision}>
            <textarea value={decisionText} onChange={(event) => setDecisionText(event.target.value)} rows={3} placeholder="Qual decisão você está tomando?" />
            <textarea value={decisionExpectation} onChange={(event) => setDecisionExpectation(event.target.value)} rows={3} placeholder="O que você espera que aconteça?" />
            <label>
              confiança hoje · {confidence}%
              <input type="range" min="0" max="100" step="5" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} />
            </label>
            <button type="submit">Guardar decisão</button>
          </form>

          <div className="decision-pattern-card">
            <small>O QUE O EU ESTÁ APRENDENDO</small>
            <strong>{decisionPattern.insight}</strong>
            {decisionPattern.withResearchGoodRate != null && (
              <div>
                <span>com pesquisa · {decisionPattern.withResearchGoodRate}% boas</span>
                {decisionPattern.withoutResearchGoodRate != null && <span>sem pesquisa · {decisionPattern.withoutResearchGoodRate}% boas</span>}
              </div>
            )}
          </div>

          <div className="decision-history-mini">
            {records.filter((record) => record.type === 'Decisão' && !record.private).slice(0, 5).map((record) => (
              <NavLink key={record.id} to={'/registro/' + record.id}>
                <span>{record.confidence != null ? record.confidence + '% confiança' : 'sem confiança registrada'}</span>
                <strong>{record.text}</strong>
                <small>{record.outcome ? 'resultado: ' + record.outcome : 'resultado ainda aberto'}</small>
              </NavLink>
            ))}
          </div>
        </div>
      </section>

      <section className="lab-block">
        <SectionTitle eyebrow="OBJETOS COM HISTÓRIA" title="Do desejo ao uso real" />
        <div className="object-history-grid">
          {objects.slice(0, 8).map(({ record, name, state }) => (
            <NavLink key={record.id} to={'/registro/' + record.id}>
              <Tag tone={state === 'using' ? 'green' : state === 'bought' ? 'cobalt' : state === 'sold' || state === 'replaced' ? 'muted' : 'pink'}>{state}</Tag>
              <h3>{name}</h3>
              <p>{record.outcome === 'good' ? 'valeu a pena' : record.outcome === 'regret' ? 'você faria diferente' : record.journeyStage || 'história aberta'}</p>
            </NavLink>
          ))}
          {!objects.length && <div className="soft-empty wide"><span>□</span><p>Compras e objetos ganham história quando você define o nome e a etapa no registro.</p></div>}
        </div>
      </section>

      <section className="lab-block">
        <SectionTitle eyebrow="LUGARES" title="Onde a sua vida aconteceu" />
        <div className="place-grid">
          {places.map((place) => (
            <article key={place.place}>
              <Tag tone="sky">{place.count} {place.count === 1 ? 'registro' : 'registros'}</Tag>
              <h3>{place.place}</h3>
              <p>{place.latest.text}</p>
            </article>
          ))}
          {!places.length && <div className="soft-empty wide"><span>⌖</span><p>Abra um registro e adicione um lugar. O EU começa a construir seu mapa pessoal sem precisar rastrear sua localização.</p></div>}
        </div>
      </section>

      <section className="lab-block close-phase-panel">
        <Tag tone={phaseTone}>FECHAR UMA FASE</Tag>
        <h2>Transformar um período em capítulo.</h2>
        <p>Escolha uma fase já detectada, escreva o que ficou com você e o EU fecha o ciclo sem apagar nada.</p>
        <div className="close-phase-form">
          <select value={phaseChoice} onChange={(event) => setPhaseChoice(event.target.value)}>
            <option value="">Escolha uma fase…</option>
            {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.label} · {chapter.records.length} registros</option>)}
          </select>
          <textarea value={phaseNote} onChange={(event) => setPhaseNote(event.target.value)} rows={3} placeholder="O que ficou comigo dessa fase?" />
          <button onClick={() => void closePhase()} disabled={!phaseChoice}>Fechar fase</button>
        </div>
      </section>

      <section className="lab-block vault-panel">
        <Tag tone="cobalt">SYNC VAULT</Tag>
        <h2>Um cofre local para o ecossistema.</h2>
        <p>Consolida os resumos de Fôlego, Traço e Repertório com um digest do EU em um envelope cifrado no aparelho.</p>
        <div className="vault-meta-row">
          <span>{vaultUpdatedAt ? 'última atualização ' + formatFullDate(vaultUpdatedAt) : 'ainda não criado'}</span>
          <button onClick={() => void refreshVault()}>Atualizar cofre agora</button>
        </div>
        <small>{syncVaultSecurityNote()}</small>
      </section>

      <section className="lab-block export-panel">
        <Tag tone="amber">EDIÇÃO EDITORIAL</Tag>
        <h2>Levar uma fase para fora do app.</h2>
        <p>Gera um arquivo HTML bonito e autocontido com os registros públicos mais recentes. Você pode abrir, imprimir em PDF ou guardar.</p>
        <button onClick={exportLifeLab}>Exportar “Esta fase”</button>
      </section>

      <section className="lab-block native-roadmap-card">
        <Tag tone="lime">PRÓXIMA CAMADA</Tag>
        <h2>O EU já está preparado para virar nativo.</h2>
        <p>Face ID real, widgets, Live Activities, atalhos Siri e notificações de sistema dependem de um pacote nativo. A arquitetura atual já separa armazenamento, segurança, bridges e memória para essa migração ser incremental.</p>
      </section>
    </div>
  )
}
