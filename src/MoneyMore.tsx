import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react'
import { EuIcon, Tag, type EuIconName } from './v2Ui'
import type { MoneyBundle } from './folegoNative'
import {
  addGoalContribution,
  archiveMoneyGoal,
  buildStatementCandidates,
  cancelImport,
  confirmImport,
  createAutomationRule,
  createCustomCategory,
  createDebt,
  createMoneyGoal,
  createWalletAccount,
  createWalletCard,
  loadImportRows,
  loadMoneyExtras,
  loadProjection,
  parseStatementFile,
  removeDiaryReflection,
  saveNotificationPreferences,
  setCategoryVisibility,
  stageStatementImport,
  toggleAutomation,
  toggleSubscription,
  updateImportRows,
  upsertDiaryReflection,
  type CsvMapping,
  type DiaryReflectionType,
  type ImportRow,
  type MoneyExtras,
  type NotificationPreferences,
  type ParsedStatement,
  type ProjectionResult,
  type StatementSourceKind,
} from './folegoExtras'

type MoreSection =
  | 'hub'
  | 'projection'
  | 'agenda'
  | 'diary'
  | 'goals'
  | 'subscriptions'
  | 'categories'
  | 'automations'
  | 'imports'
  | 'notifications'
  | 'organization'

function money(value?: number | null) {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(value)
}

function shortDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function monthLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(new Date(value))
}

function parseAmount(value: string) {
  const normalized = value.trim().replace(/./g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

const sectionMeta: Array<{ id: Exclude<MoreSection, 'hub'>; title: string; subtitle: string; icon: EuIconName; tone: string }> = [
  { id: 'projection', title: 'Projeções', subtitle: '3, 6, 12 ou 24 meses', icon: 'trend-up', tone: 'cobalt' },
  { id: 'agenda', title: 'Agenda financeira', subtitle: 'o que vence e entra', icon: 'clock', tone: 'amber' },
  { id: 'diary', title: 'Diário financeiro', subtitle: 'necessidade, vontade e você', icon: 'book', tone: 'pink' },
  { id: 'goals', title: 'Metas', subtitle: 'alvos e aportes', icon: 'sparkles', tone: 'green' },
  { id: 'subscriptions', title: 'Assinaturas', subtitle: 'recorrências que se repetem', icon: 'refresh', tone: 'lilac' },
  { id: 'categories', title: 'Categorias', subtitle: 'organização e visibilidade', icon: 'collections', tone: 'sky' },
  { id: 'automations', title: 'Automações', subtitle: 'regras para reconhecer gastos', icon: 'bolt', tone: 'coral' },
  { id: 'imports', title: 'Importar extrato', subtitle: 'CSV/OFX com revisão', icon: 'download', tone: 'wine' },
  { id: 'notifications', title: 'Alertas financeiros', subtitle: 'lembretes e histórico', icon: 'bell', tone: 'amber' },
  { id: 'organization', title: 'Organização', subtitle: 'contas, cartões e dívidas', icon: 'wallet', tone: 'cobalt' },
]

export default function MoneyMore({ bundle, onChanged }: { bundle: MoneyBundle; onChanged: () => void }) {
  const [section, setSection] = useState<MoreSection>('hub')
  const [extras, setExtras] = useState<MoneyExtras | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  async function refresh(horizon = extras?.projection?.horizon_months || 12) {
    setLoading(true)
    setError('')
    try {
      setExtras(await loadMoneyExtras(bundle.space.id, bundle.session.user.id, horizon))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui abrir as ferramentas financeiras.')
    } finally {
      setLoading(false)
    }
  }

  async function act(key: string, fn: () => Promise<void>) {
    setBusy(key)
    setError('')
    try {
      await fn()
      await refresh()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui concluir essa ação.')
    } finally {
      setBusy('')
    }
  }

  useEffect(() => { void refresh() }, [bundle.space.id])

  if (loading && !extras) return <div className="money-loading"><span /><p>Carregando o restante do FÔLEGO…</p></div>
  if (!extras) return <div className="money-empty">{error || 'Não foi possível carregar.'}</div>

  return (
    <section className="money-more">
      {section === 'hub' ? (
        <>
          <div className="money-section-title">
            <div><small>FÔLEGO COMPLETO</small><h2>O resto também mora aqui.</h2><p>Ferramentas avançadas que antes ficavam espalhadas pelo app financeiro.</p></div>
          </div>
          {error && <MoneyInlineError text={error} />}
          <div className="money-tool-grid">
            {sectionMeta.map((item) => (
              <button key={item.id} className={'money-tool-card tool-' + item.tone} onClick={() => setSection(item.id)}>
                <span><EuIcon name={item.icon} /></span>
                <div><strong>{item.title}</strong><small>{item.subtitle}</small></div>
                <EuIcon name="arrow-right" />
              </button>
            ))}
          </div>
          <div className="money-more-status">
            <Tag tone="green">NATIVO</Tag>
            <p>Essas áreas usam o mesmo banco e as mesmas regras do FÔLEGO. Nenhum dado é copiado para um banco paralelo.</p>
          </div>
        </>
      ) : (
        <>
          <button className="money-back-button" onClick={() => setSection('hub')}><EuIcon name="arrow-left" />Todas as ferramentas</button>
          {error && <MoneyInlineError text={error} />}
          {section === 'projection' && <ProjectionView bundle={bundle} extras={extras} setExtras={setExtras} setError={setError} />}
          {section === 'agenda' && <AgendaView extras={extras} />}
          {section === 'diary' && <DiaryView bundle={bundle} extras={extras} busy={busy} act={act} />}
          {section === 'goals' && <GoalsView bundle={bundle} busy={busy} act={act} />}
          {section === 'subscriptions' && <SubscriptionsView bundle={bundle} extras={extras} busy={busy} act={act} />}
          {section === 'categories' && <CategoriesView bundle={bundle} extras={extras} busy={busy} act={act} />}
          {section === 'automations' && <AutomationsView bundle={bundle} extras={extras} busy={busy} act={act} />}
          {section === 'imports' && <ImportsView bundle={bundle} extras={extras} refresh={refresh} setError={setError} />}
          {section === 'notifications' && <NotificationsView bundle={bundle} extras={extras} busy={busy} act={act} />}
          {section === 'organization' && <OrganizationView bundle={bundle} busy={busy} act={act} />}
        </>
      )}
    </section>
  )
}

function MoneyInlineError({ text }: { text: string }) {
  return <div className="money-error money-inline-error"><EuIcon name="help" /><span>{text}</span></div>
}

function ProjectionView({
  bundle,
  extras,
  setExtras,
  setError,
}: {
  bundle: MoneyBundle
  extras: MoneyExtras
  setExtras: (value: MoneyExtras) => void
  setError: (value: string) => void
}) {
  const [horizon, setHorizon] = useState(extras.projection?.horizon_months || 12)
  const [loading, setLoading] = useState(false)
  const projection = extras.projection

  async function choose(next: number) {
    setHorizon(next)
    setLoading(true)
    setError('')
    try {
      const result = await loadProjection(bundle.space.id, next)
      setExtras({ ...extras, projection: result })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui recalcular a projeção.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="money-extra-view">
      <MoneyExtraHeading eyebrow="PROJEÇÃO" title="Seu dinheiro no tempo" copy="O mesmo motor de projeção do FÔLEGO, agora dentro da sua central." icon="trend-up" />
      <div className="money-segmented">
        {[3, 6, 12, 24].map((item) => <button key={item} className={horizon === item ? 'active' : ''} disabled={loading} onClick={() => void choose(item)}>{item} meses</button>)}
      </div>
      {!projection ? <div className="money-empty">Ainda não há projeção disponível.</div> : (
        <>
          <div className="money-projection-summary">
            <article><small>saldo final</small><strong>{money(projection.summary.ending_balance)}</strong></article>
            <article><small>mínimo</small><strong className={projection.summary.minimum_balance < 0 ? 'negative' : ''}>{money(projection.summary.minimum_balance)}</strong></article>
            <article><small>poupança projetada</small><strong>{money(projection.summary.projected_savings)}</strong></article>
          </div>
          {projection.summary.critical_month && <div className="money-attention"><EuIcon name="help" /><span>Primeiro mês crítico: <strong>{monthLabel(projection.summary.critical_month)}</strong>.</span></div>}
          <div className="money-projection-list">
            {projection.months.map((item) => (
              <article key={item.month}>
                <div><strong>{monthLabel(item.month)}</strong><small>abre {money(item.opening_balance)}</small></div>
                <div className="money-projection-flow"><span>entra {money(item.income)}</span><span>sai {money(item.direct_expenses + item.recurring_expenses + item.card_installments + item.debts + item.reserve_transfers + item.investments)}</span></div>
                <b className={item.closing_projected < 0 ? 'negative' : ''}>{money(item.closing_projected)}</b>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function AgendaView({ extras }: { extras: MoneyExtras }) {
  return (
    <div className="money-extra-view">
      <MoneyExtraHeading eyebrow="AGENDA FINANCEIRA" title="O que vem pela frente" copy="Vencimentos, recorrências, parcelas e entradas previstas em até 60 dias." icon="clock" />
      <div className="money-agenda-list">
        {extras.upcoming.map((item) => (
          <article key={item.event_key} className={item.overdue ? 'overdue' : ''}>
            <span className="money-agenda-date"><b>{new Date(item.due_date).getDate()}</b><small>{new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(item.due_date))}</small></span>
            <div><strong>{item.title}</strong><small>{item.subtitle || item.source}{item.recurring ? ' · recorrente' : ''}{item.installment_number ? ' · ' + item.installment_number + '/' + (item.installment_count || '?') : ''}</small></div>
            <b>{item.direction === 'inflow' || item.direction === 'income' ? '+' : '−'} {money(Math.abs(item.amount))}</b>
          </article>
        ))}
        {!extras.upcoming.length && <div className="money-empty">Nada previsto nos próximos 60 dias.</div>}
      </div>
    </div>
  )
}

function DiaryView({
  bundle,
  extras,
  busy,
  act,
}: {
  bundle: MoneyBundle
  extras: MoneyExtras
  busy: string
  act: (key: string, fn: () => Promise<void>) => Promise<void>
}) {
  const reflected = extras.diary.filter((item) => item.reflection)
  const totals = reflected.reduce<Record<DiaryReflectionType, number>>((acc, item) => {
    if (item.reflection) acc[item.reflection.type] += Math.abs(item.amount)
    return acc
  }, { necessary: 0, want: 0, self_investment: 0 })
  const labels: Record<DiaryReflectionType, string> = { necessary: 'necessário', want: 'vontade', self_investment: 'investimento em mim' }

  return (
    <div className="money-extra-view">
      <MoneyExtraHeading eyebrow="DIÁRIO FINANCEIRO" title="O dinheiro também conta uma história" copy="Dê contexto aos gastos, sem transformar tudo em culpa." icon="book" />
      <div className="money-diary-summary">
        {(Object.keys(labels) as DiaryReflectionType[]).map((type) => <article key={type}><small>{labels[type]}</small><strong>{money(totals[type])}</strong></article>)}
      </div>
      <div className="money-diary-list">
        {extras.diary.map((item) => (
          <article key={item.eventId}>
            <div className="money-diary-main">
              <div><strong>{item.description}</strong><small>{item.categoryName || 'A classificar'} · {shortDate(item.occurredAt)}</small></div>
              <b>{money(Math.abs(item.amount))}</b>
            </div>
            {item.reflection ? (
              <div className="money-reflection-done">
                <Tag tone={item.reflection.type === 'necessary' ? 'green' : item.reflection.type === 'want' ? 'pink' : 'cobalt'}>{labels[item.reflection.type]}</Tag>
                <button disabled={busy === item.eventId} onClick={() => void act(item.eventId, () => removeDiaryReflection(bundle.space.id, item.eventId))}>remover</button>
              </div>
            ) : (
              <div className="money-reflection-actions">
                {(Object.keys(labels) as DiaryReflectionType[]).map((type) => (
                  <button key={type} disabled={busy === item.eventId} onClick={() => void act(item.eventId, () => upsertDiaryReflection(bundle.space.id, item.eventId, type))}>{labels[type]}</button>
                ))}
              </div>
            )}
          </article>
        ))}
        {!extras.diary.length && <div className="money-empty">Nenhum gasto elegível neste mês.</div>}
      </div>
    </div>
  )
}

function GoalsView({
  bundle,
  busy,
  act,
}: {
  bundle: MoneyBundle
  busy: string
  act: (key: string, fn: () => Promise<void>) => Promise<void>
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [goalId, setGoalId] = useState(bundle.goals[0]?.id || '')
  const [contribution, setContribution] = useState('')

  async function submitGoal(event: FormEvent) {
    event.preventDefault()
    const amount = parseAmount(target)
    if (!name.trim() || amount <= 0) return
    await act('goal-create', () => createMoneyGoal(bundle.space.id, name, amount, targetDate || undefined))
    setName(''); setTarget(''); setTargetDate(''); setCreateOpen(false)
  }

  async function contribute(event: FormEvent) {
    event.preventDefault()
    const amount = parseAmount(contribution)
    if (!goalId || amount <= 0) return
    await act('goal-contribute', () => addGoalContribution(bundle.space.id, goalId, amount))
    setContribution('')
  }

  return (
    <div className="money-extra-view">
      <MoneyExtraHeading eyebrow="METAS" title="Dinheiro com destino" copy="Crie alvos e registre aportes sem sair do EU." icon="sparkles" action={<button className="money-small-action" onClick={() => setCreateOpen((v) => !v)}><EuIcon name="plus" />meta</button>} />
      {createOpen && (
        <form className="money-mini-form" onSubmit={submitGoal}>
          <input placeholder="Nome da meta" value={name} onChange={(e) => setName(e.target.value)} />
          <input inputMode="decimal" placeholder="Valor alvo" value={target} onChange={(e) => setTarget(e.target.value)} />
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          <button disabled={busy === 'goal-create'}>Criar meta</button>
        </form>
      )}
      {!!bundle.goals.length && (
        <form className="money-contribution-form" onSubmit={contribute}>
          <select value={goalId} onChange={(e) => setGoalId(e.target.value)}>{bundle.goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}</select>
          <input inputMode="decimal" placeholder="Aporte R$" value={contribution} onChange={(e) => setContribution(e.target.value)} />
          <button disabled={busy === 'goal-contribute'}>Aportar</button>
        </form>
      )}
      <div className="money-goals money-goals-detailed">
        {bundle.goals.map((goal) => {
          const pct = goal.target > 0 ? Math.min(100, Math.round((goal.contributed / goal.target) * 100)) : 0
          return (
            <article key={goal.id}>
              <div><strong>{goal.name}</strong><span>{pct}%</span></div>
              <div className="money-goal-bar"><span style={{ width: pct + '%' }} /></div>
              <p>{money(goal.contributed)} de {money(goal.target)}{goal.target_date ? ' · ' + shortDate(goal.target_date) : ''}</p>
              <button className="money-text-danger" disabled={busy === 'archive-' + goal.id} onClick={() => { if (window.confirm('Arquivar esta meta?')) void act('archive-' + goal.id, () => archiveMoneyGoal(bundle.space.id, goal.id)) }}>arquivar</button>
            </article>
          )
        })}
        {!bundle.goals.length && <div className="money-empty">Nenhuma meta ativa.</div>}
      </div>
    </div>
  )
}

function SubscriptionsView({
  bundle,
  extras,
  busy,
  act,
}: {
  bundle: MoneyBundle
  extras: MoneyExtras
  busy: string
  act: (key: string, fn: () => Promise<void>) => Promise<void>
}) {
  const subscriptionIds = new Set(extras.subscriptions.map((item) => item.id))
  const candidates = bundle.recurring.filter((item) => !subscriptionIds.has(item.id))
  return (
    <div className="money-extra-view">
      <MoneyExtraHeading eyebrow="ASSINATURAS" title="O que cobra de novo todo mês" copy="Separadas das demais recorrências para você enxergar o peso delas." icon="refresh" />
      <div className="money-simple-list">
        {extras.subscriptions.map((item) => (
          <article key={item.id}>
            <span><EuIcon name="refresh" /></span>
            <div><strong>{item.name}</strong><small>{item.frequency}{item.day_of_month ? ' · dia ' + item.day_of_month : ''}</small></div>
            <div className="money-row-action"><b>{money(item.amount)}</b><button disabled={busy === item.id} onClick={() => void act(item.id, () => toggleSubscription(bundle.space.id, item.id, false))}>tirar</button></div>
          </article>
        ))}
        {!extras.subscriptions.length && <div className="money-empty">Nenhuma recorrência marcada como assinatura.</div>}
      </div>
      {!!candidates.length && <><h3 className="money-subtitle">Marcar como assinatura</h3><div className="money-chip-list">{candidates.slice(0, 20).map((item) => <button key={item.id} disabled={busy === item.id} onClick={() => void act(item.id, () => toggleSubscription(bundle.space.id, item.id, true))}><EuIcon name="plus" />{item.name}</button>)}</div></>}
    </div>
  )
}

function CategoriesView({
  bundle,
  extras,
  busy,
  act,
}: {
  bundle: MoneyBundle
  extras: MoneyExtras
  busy: string
  act: (key: string, fn: () => Promise<void>) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  async function create(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    await act('category-create', () => createCustomCategory({ spaceId: bundle.space.id, name, kind }))
    setName('')
  }
  return (
    <div className="money-extra-view">
      <MoneyExtraHeading eyebrow="CATEGORIAS" title="Seu vocabulário financeiro" copy="Categorias ocultas continuam recuperáveis; categorias próprias podem ser criadas aqui." icon="collections" />
      <form className="money-contribution-form money-category-create" onSubmit={create}>
        <select value={kind} onChange={(e) => setKind(e.target.value as 'expense' | 'income')}><option value="expense">Despesa</option><option value="income">Receita</option></select>
        <input placeholder="Nova categoria" value={name} onChange={(e) => setName(e.target.value)} />
        <button disabled={busy === 'category-create'}>Criar</button>
      </form>
      <div className="money-setting-list">
        {extras.categories.map((item) => (
          <article key={item.id}>
            <div><strong>{item.path}</strong><small>{item.kind === 'expense' ? 'despesa' : 'receita'}{item.is_system ? ' · sistema' : ' · personalizada'}{item.essential ? ' · essencial' : ''}</small></div>
            <button className={'money-switch ' + (item.active ? 'on' : '')} disabled={busy === item.id} onClick={() => void act(item.id, () => setCategoryVisibility(bundle.space.id, item.id, !item.active))}><span /></button>
          </article>
        ))}
      </div>
    </div>
  )
}

function AutomationsView({
  bundle,
  extras,
  busy,
  act,
}: {
  bundle: MoneyBundle
  extras: MoneyExtras
  busy: string
  act: (key: string, fn: () => Promise<void>) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [match, setMatch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  async function create(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || !match.trim()) return
    await act('automation-create', () => createAutomationRule({ spaceId: bundle.space.id, userId: bundle.session.user.id, name, matchValue: match, categoryId: categoryId || null }))
    setName(''); setMatch(''); setCategoryId('')
  }
  return (
    <div className="money-extra-view">
      <MoneyExtraHeading eyebrow="AUTOMAÇÕES" title="O app aprende seus padrões" copy="Regras simples sugerem classificação quando um novo extrato é importado." icon="bolt" />
      <form className="money-mini-form money-automation-create" onSubmit={create}>
        <input placeholder="Nome da regra" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder={'Descrição contém…'} value={match} onChange={(e) => setMatch(e.target.value)} />
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">Sem categoria fixa</option>{bundle.expenseCategories.map((item) => <option key={item.id} value={item.id}>{item.path}</option>)}</select>
        <button disabled={busy === 'automation-create'}>Criar regra</button>
      </form>
      <div className="money-setting-list">
        {extras.automations.map((item) => (
          <article key={item.id}>
            <div><strong>{item.name}</strong><small>{item.match_field || 'descrição'} {item.match_type || 'contém'} “{item.match_value || '—'}” · {item.execution_mode || 'suggest'}</small></div>
            <button className={'money-switch ' + (item.active ? 'on' : '')} disabled={busy === item.id} onClick={() => void act(item.id, () => toggleAutomation(bundle.space.id, item.id, !item.active))}><span /></button>
          </article>
        ))}
        {!extras.automations.length && <div className="money-empty">Nenhuma regra criada ainda.</div>}
      </div>
    </div>
  )
}

function ImportsView({
  bundle,
  extras,
  refresh,
  setError,
}: {
  bundle: MoneyBundle
  extras: MoneyExtras
  refresh: () => Promise<void>
  setError: (value: string) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [sourceKind, setSourceKind] = useState<StatementSourceKind>('account')
  const [sourceId, setSourceId] = useState(bundle.accounts[0]?.id || '')
  const [parsed, setParsed] = useState<ParsedStatement | null>(null)
  const [mapping, setMapping] = useState<CsvMapping>({ date: -1, description: -1, amount: -1, merchant: -1, externalId: -1 })
  const [batchId, setBatchId] = useState('')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [busy, setBusy] = useState('')

  useEffect(() => {
    setSourceId(sourceKind === 'card' ? bundle.cards[0]?.id || '' : bundle.accounts[0]?.id || '')
  }, [sourceKind])

  async function pick(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] || null
    setFile(next); setParsed(null); setBatchId(''); setRows([])
    if (!next) return
    setBusy('parse'); setError('')
    try {
      const result = await parseStatementFile(next, sourceKind)
      setParsed(result)
      setMapping(result.suggested)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui ler esse arquivo.')
    } finally {
      setBusy('')
    }
  }

  async function stage() {
    if (!file || !parsed || !sourceId) return
    setBusy('stage'); setError('')
    try {
      if (parsed.fileType === 'csv') buildStatementCandidates(parsed, mapping, sourceKind)
      const id = await stageStatementImport({
        spaceId: bundle.space.id,
        file,
        sourceKind,
        sourceAccountId: sourceKind === 'card' ? null : sourceId,
        sourceCardId: sourceKind === 'card' ? sourceId : null,
        parsed,
        mapping,
      })
      setBatchId(id)
      setRows(await loadImportRows(bundle.space.id, id))
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui preparar a importação.')
    } finally {
      setBusy('')
    }
  }

  function patchRow(id: string, patch: Partial<ImportRow>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row))
  }

  async function saveReview() {
    if (!batchId) return
    setBusy('review'); setError('')
    try {
      await updateImportRows(bundle.space.id, batchId, rows)
      setRows(await loadImportRows(bundle.space.id, batchId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui salvar a revisão.')
    } finally {
      setBusy('')
    }
  }

  async function confirm() {
    if (!batchId) return
    setBusy('confirm'); setError('')
    try {
      await updateImportRows(bundle.space.id, batchId, rows)
      await confirmImport(bundle.space.id, batchId)
      setFile(null); setParsed(null); setBatchId(''); setRows([])
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A importação não pôde ser confirmada.')
    } finally {
      setBusy('')
    }
  }

  async function cancel() {
    if (!batchId) return
    setBusy('cancel'); setError('')
    try {
      await cancelImport(bundle.space.id, batchId)
      setBatchId(''); setRows([]); setParsed(null); setFile(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui cancelar.')
    } finally {
      setBusy('')
    }
  }

  const sourceOptions = sourceKind === 'card' ? bundle.cards : bundle.accounts
  return (
    <div className="money-extra-view">
      <MoneyExtraHeading eyebrow="IMPORTAÇÃO" title="Extrato entra primeiro em revisão" copy="CSV e OFX passam por staging, deduplicação e regras antes de tocar no ledger." icon="download" />
      <div className="money-import-config">
        <label>Origem<select value={sourceKind} onChange={(e) => { setSourceKind(e.target.value as StatementSourceKind); setParsed(null); setFile(null) }}><option value="account">Conta</option><option value="card">Cartão</option><option value="benefit">Benefício</option></select></label>
        <label>Instrumento<select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>{sourceOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="money-file-label">Arquivo<input type="file" accept=".csv,.ofx,text/csv,application/x-ofx" onChange={(e) => void pick(e)} /><span><EuIcon name="download" />{file?.name || 'Escolher CSV ou OFX'}</span></label>
      </div>

      {parsed?.fileType === 'csv' && (
        <div className="money-mapping">
          <h3>Mapeamento</h3>
          <p>Confirme as três colunas obrigatórias. O EU tentou reconhecer automaticamente.</p>
          {([
            ['date', 'Data'],
            ['description', 'Descrição'],
            ['amount', 'Valor'],
            ['merchant', 'Estabelecimento'],
            ['externalId', 'ID externo'],
          ] as Array<[keyof CsvMapping, string]>).map(([key, label]) => (
            <label key={key}>{label}<select value={mapping[key]} onChange={(e) => setMapping({ ...mapping, [key]: Number(e.target.value) })}><option value={-1}>não usar</option>{parsed.headers.map((header, index) => <option key={index} value={index}>{header}</option>)}</select></label>
          ))}
        </div>
      )}

      {parsed && !batchId && <button className="money-primary-action money-import-stage" disabled={busy !== '' || !sourceId} onClick={() => void stage()}>{busy === 'stage' || busy === 'parse' ? 'Preparando…' : 'Preparar revisão'}</button>}

      {!!batchId && (
        <div className="money-import-review">
          <div className="money-section-title"><div><small>REVISÃO</small><h2>{rows.length} linhas</h2><p>Nada entra no histórico até você confirmar.</p></div></div>
          <div className="money-import-rows">
            {rows.map((row) => (
              <article key={row.id} className={row.duplicate_state && row.duplicate_state !== 'unique' ? 'duplicate' : ''}>
                <div className="money-import-row-top"><div><strong>{row.description}</strong><small>{shortDate(row.occurred_at)} · {row.candidate_type || 'revisar'}{row.automation_recognized ? ' · regra reconheceu' : ''}</small></div><b>{money(row.amount)}</b></div>
                <div className="money-import-controls">
                  <select value={row.user_decision || 'review'} onChange={(e) => patchRow(row.id, { user_decision: e.target.value as ImportRow['user_decision'] })}><option value="include">incluir</option><option value="ignore">ignorar</option><option value="review">revisar</option></select>
                  <select value={row.category_id || row.automation_suggested_category_id || ''} onChange={(e) => patchRow(row.id, { category_id: e.target.value || null })}><option value="">sem categoria</option>{bundle.expenseCategories.map((item) => <option key={item.id} value={item.id}>{item.path}</option>)}</select>
                </div>
                {row.duplicate_state && row.duplicate_state !== 'unique' && <small className="money-duplicate-note">Possível duplicidade: {row.duplicate_state}</small>}
              </article>
            ))}
          </div>
          <div className="money-import-actions">
            <button onClick={() => void cancel()} disabled={busy !== ''}>Cancelar</button>
            <button onClick={() => void saveReview()} disabled={busy !== ''}>Salvar revisão</button>
            <button className="primary" onClick={() => void confirm()} disabled={busy !== ''}>Confirmar importação</button>
          </div>
        </div>
      )}

      <h3 className="money-subtitle">Importações recentes</h3>
      <div className="money-simple-list">
        {extras.importBatches.map((batch) => <article key={batch.id}><span><EuIcon name="file" /></span><div><strong>{batch.filename}</strong><small>{batch.file_type.toUpperCase()} · {batch.source_kind} · {shortDate(batch.created_at)}</small></div><div className="money-import-batch-count"><b>{batch.status}</b><small>{batch.imported_rows}/{batch.total_rows}</small></div></article>)}
        {!extras.importBatches.length && <div className="money-empty">Nenhuma importação feita ainda.</div>}
      </div>
    </div>
  )
}

function NotificationsView({
  bundle,
  extras,
  busy,
  act,
}: {
  bundle: MoneyBundle
  extras: MoneyExtras
  busy: string
  act: (key: string, fn: () => Promise<void>) => Promise<void>
}) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(extras.notificationPreferences)
  const toggles: Array<[keyof NotificationPreferences, string]> = [
    ['financial_reminders_enabled', 'Lembretes financeiros'],
    ['invoices_enabled', 'Faturas'],
    ['debts_enabled', 'Dívidas'],
    ['recurrences_enabled', 'Recorrências'],
    ['subscriptions_enabled', 'Assinaturas'],
    ['expected_income_enabled', 'Entradas esperadas'],
    ['overdue_enabled', 'Atrasos'],
    ['plan_thresholds_enabled', 'Limites do plano'],
    ['card_limit_thresholds_enabled', 'Limite do cartão'],
    ['large_expenses_enabled', 'Gastos grandes'],
    ['daily_summary_enabled', 'Resumo diário'],
    ['quiet_hours_enabled', 'Horário silencioso'],
  ]

  return (
    <div className="money-extra-view">
      <MoneyExtraHeading eyebrow="ALERTAS" title="O dinheiro avisa antes de apertar" copy="Preferências do mesmo sistema de notificações do FÔLEGO." icon="bell" />
      <div className="money-setting-list">
        {toggles.map(([key, label]) => (
          <article key={key}>
            <div><strong>{label}</strong><small>{Boolean(prefs[key]) ? 'ativado' : 'desativado'}</small></div>
            <button className={'money-switch ' + (Boolean(prefs[key]) ? 'on' : '')} onClick={() => setPrefs({ ...prefs, [key]: !prefs[key] })}><span /></button>
          </article>
        ))}
      </div>
      <div className="money-time-settings">
        <label>Lembrar com antecedência<input type="number" min="0" max="30" value={prefs.reminder_offset_days} onChange={(e) => setPrefs({ ...prefs, reminder_offset_days: Number(e.target.value) })} /><span>dias</span></label>
        <label>Horário preferido<input type="time" value={prefs.preferred_time.slice(0,5)} onChange={(e) => setPrefs({ ...prefs, preferred_time: e.target.value })} /></label>
        <label>Resumo diário<input type="time" value={prefs.daily_summary_time.slice(0,5)} onChange={(e) => setPrefs({ ...prefs, daily_summary_time: e.target.value })} /></label>
        <label>Gasto grande a partir de<input inputMode="decimal" value={prefs.large_expense_threshold} onChange={(e) => setPrefs({ ...prefs, large_expense_threshold: Number(e.target.value) || 0 })} /></label>
      </div>
      <button className="money-primary-action" disabled={busy === 'notifications'} onClick={() => void act('notifications', () => saveNotificationPreferences(bundle.space.id, bundle.session.user.id, prefs))}>Salvar alertas</button>
      <h3 className="money-subtitle">Histórico</h3>
      <div className="money-notification-history">
        {extras.notificationHistory.map((item) => <article key={String(item.id)}><span><EuIcon name="bell" /></span><div><strong>{item.title}</strong><p>{item.body}</p><small>{shortDate(item.delivered_at)}</small></div></article>)}
        {!extras.notificationHistory.length && <div className="money-empty">Nenhum alerta entregue ainda.</div>}
      </div>
    </div>
  )
}

function OrganizationView({
  bundle,
  busy,
  act,
}: {
  bundle: MoneyBundle
  busy: string
  act: (key: string, fn: () => Promise<void>) => Promise<void>
}) {
  const [mode, setMode] = useState<'account' | 'card' | 'debt'>('account')
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [opening, setOpening] = useState('0')
  const [accountType, setAccountType] = useState('checking')
  const [closingDay, setClosingDay] = useState('5')
  const [dueDay, setDueDay] = useState('12')
  const [paymentAccountId, setPaymentAccountId] = useState(bundle.accounts[0]?.id || '')
  const [limit, setLimit] = useState('')
  const [creditor, setCreditor] = useState('')
  const [installments, setInstallments] = useState('1')
  const [firstDue, setFirstDue] = useState('')
  const [interest, setInterest] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    if (mode === 'account') {
      await act('organization-create', () => createWalletAccount({ spaceId: bundle.space.id, name, type: accountType, openingBalance: parseAmount(opening), institution, availableForSpending: true }))
    } else if (mode === 'card') {
      if (!paymentAccountId) return
      await act('organization-create', () => createWalletCard({ spaceId: bundle.space.id, name, closingDay: Number(closingDay), dueDay: Number(dueDay), paymentAccountId, issuer: institution, personalLimit: limit ? parseAmount(limit) : null }))
    } else {
      if (!paymentAccountId || !firstDue) return
      await act('organization-create', () => createDebt({ spaceId: bundle.space.id, name, creditor, originalAmount: parseAmount(opening), totalInstallments: Number(installments), firstDue, paymentAccountId, interestRateMonthly: interest ? Number(interest.replace(',', '.')) : null }))
    }
    setName(''); setInstitution(''); setOpening('0'); setLimit(''); setCreditor(''); setInterest('')
  }

  return (
    <div className="money-extra-view">
      <MoneyExtraHeading eyebrow="ORGANIZAÇÃO" title="A estrutura da sua carteira" copy="Cadastre contas, cartões e dívidas no mesmo backend financeiro." icon="wallet" />
      <div className="money-segmented"><button className={mode === 'account' ? 'active' : ''} onClick={() => setMode('account')}>Conta</button><button className={mode === 'card' ? 'active' : ''} onClick={() => setMode('card')}>Cartão</button><button className={mode === 'debt' ? 'active' : ''} onClick={() => setMode('debt')}>Dívida</button></div>
      <form className="money-mini-form money-organization-form" onSubmit={submit}>
        <input placeholder={mode === 'debt' ? 'Nome da dívida' : mode === 'card' ? 'Nome do cartão' : 'Nome da conta'} value={name} onChange={(e) => setName(e.target.value)} />
        {mode === 'account' && <>
          <input placeholder="Instituição" value={institution} onChange={(e) => setInstitution(e.target.value)} />
          <select value={accountType} onChange={(e) => setAccountType(e.target.value)}><option value="checking">Conta corrente</option><option value="savings">Poupança</option><option value="cash">Dinheiro</option><option value="investment">Investimento</option><option value="benefit">Benefício</option></select>
          <input inputMode="decimal" placeholder="Saldo inicial" value={opening} onChange={(e) => setOpening(e.target.value)} />
        </>}
        {mode === 'card' && <>
          <input placeholder="Emissor" value={institution} onChange={(e) => setInstitution(e.target.value)} />
          <div className="money-inline-fields"><input type="number" min="1" max="31" placeholder="Fecha" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} /><input type="number" min="1" max="31" placeholder="Vence" value={dueDay} onChange={(e) => setDueDay(e.target.value)} /></div>
          <select value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)}>{bundle.accounts.map((item) => <option key={item.id} value={item.id}>Pagar com {item.name}</option>)}</select>
          <input inputMode="decimal" placeholder="Limite pessoal (opcional)" value={limit} onChange={(e) => setLimit(e.target.value)} />
        </>}
        {mode === 'debt' && <>
          <input placeholder="Credor" value={creditor} onChange={(e) => setCreditor(e.target.value)} />
          <input inputMode="decimal" placeholder="Valor original" value={opening} onChange={(e) => setOpening(e.target.value)} />
          <div className="money-inline-fields"><input type="number" min="1" placeholder="Parcelas" value={installments} onChange={(e) => setInstallments(e.target.value)} /><input inputMode="decimal" placeholder="Juros % a.m." value={interest} onChange={(e) => setInterest(e.target.value)} /></div>
          <input type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} />
          <select value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)}>{bundle.accounts.map((item) => <option key={item.id} value={item.id}>Pagar com {item.name}</option>)}</select>
        </>}
        <button disabled={busy === 'organization-create'}>{busy === 'organization-create' ? 'Salvando…' : 'Adicionar ' + (mode === 'account' ? 'conta' : mode === 'card' ? 'cartão' : 'dívida')}</button>
      </form>
      <div className="money-org-summary">
        <article><strong>{bundle.accounts.length}</strong><span>contas</span></article>
        <article><strong>{bundle.cards.length}</strong><span>cartões</span></article>
        <article><strong>{bundle.debts.length}</strong><span>dívidas</span></article>
      </div>
    </div>
  )
}

function MoneyExtraHeading({
  eyebrow,
  title,
  copy,
  icon,
  action,
}: {
  eyebrow: string
  title: string
  copy: string
  icon: EuIconName
  action?: React.ReactNode
}) {
  return (
    <header className="money-extra-heading">
      <span><EuIcon name={icon} /></span>
      <div><small>{eyebrow}</small><h2>{title}</h2><p>{copy}</p></div>
      {action}
    </header>
  )
}
