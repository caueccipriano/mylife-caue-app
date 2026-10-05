import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { BrandTop, EuIcon, Tag } from './v2Ui'
import MoneyMore from './MoneyMore'
import {
  loadMoneyBundle,
  moneySupabase,
  registerMoneyMovement,
  signInMoney,
  signOutMoney,
  type MoneyBundle,
  type MoneyCategory,
} from './folegoNative'

type MoneyView = 'overview' | 'movement' | 'plan' | 'wallet' | 'more'

function money(value?: number | null) {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(value)
}

function dateLabel(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function statusLabel(value: string) {
  if (value === 'tranquilo') return 'dentro do plano'
  if (value === 'apertado') return 'apertado'
  if (value === 'segure_gastos') return 'segure gastos'
  if (value === 'sem_folga') return 'sem folga'
  if (value === 'configurar_recebimento') return 'configure seu recebimento'
  return value.replaceAll('_', ' ')
}

function eventSign(type: string) {
  return ['income', 'reimbursement', 'benefit_credit'].includes(type) ? 1 : -1
}

function eventLabel(type: string) {
  if (type === 'expense') return 'despesa'
  if (type === 'income') return 'receita'
  if (type === 'transfer') return 'transferência'
  if (type.includes('card')) return 'cartão'
  if (type.includes('debt')) return 'dívida'
  return type.replaceAll('_', ' ')
}

export default function MoneyPage() {
  const [view, setView] = useState<MoneyView>('overview')
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [bundle, setBundle] = useState<MoneyBundle | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [registerOpen, setRegisterOpen] = useState(false)

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      setBundle(await loadMoneyBundle())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui carregar suas finanças.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    void moneySupabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setAuthenticated(Boolean(data.session))
      if (data.session) void refresh()
    })
    const { data } = moneySupabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setAuthenticated(Boolean(session))
      if (session) void refresh()
      else setBundle(null)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  if (authenticated === null) {
    return <div className="v2-page money-page"><BrandTop /><div className="money-loading"><span /><p>Abrindo seu Dinheiro…</p></div></div>
  }

  if (!authenticated) {
    return <MoneyLogin onSignedIn={() => { setAuthenticated(true); void refresh() }} />
  }

  const tabs: Array<{ id: MoneyView; label: string }> = [
    { id: 'overview', label: 'Visão' },
    { id: 'movement', label: 'Movimento' },
    { id: 'plan', label: 'Plano' },
    { id: 'wallet', label: 'Carteira' },
    { id: 'more', label: 'Mais' },
  ]

  const budgetProgress = bundle?.snapshot.monthlyBudgetPlanned
    ? Math.min(100, Math.round((bundle.snapshot.monthlyBudgetUsed / bundle.snapshot.monthlyBudgetPlanned) * 100))
    : 0

  return (
    <div className="v2-page money-page">
      <BrandTop />

      <header className="money-header">
        <div>
          <Tag tone="cobalt">DINHEIRO · FÔLEGO</Tag>
          <h1>Seu dinheiro<br />dentro do EU.</h1>
          <p>O mesmo motor financeiro do FÔLEGO, agora como parte da sua central de vida.</p>
        </div>
        <button className="money-refresh" onClick={() => void refresh()} disabled={loading} aria-label="Atualizar finanças">
          <EuIcon name="refresh" />
        </button>
      </header>

      <nav className="money-tabs" aria-label="Visões financeiras">
        {tabs.map((tab) => (
          <button key={tab.id} className={view === tab.id ? 'active' : ''} onClick={() => setView(tab.id)}>
            {tab.label}
          </button>
        ))}
      </nav>

      {error && <div className="money-error"><EuIcon name="help" /><span>{error}</span><button onClick={() => void refresh()}>tentar de novo</button></div>}

      {!bundle ? (
        <div className="money-loading"><span /><p>{loading ? 'Atualizando…' : 'Sem dados financeiros disponíveis.'}</p></div>
      ) : (
        <>
          {view === 'overview' && (
            <>
              <section className="money-hero">
                <div className="money-hero-top">
                  <span>SEU FÔLEGO HOJE</span>
                  <b>{statusLabel(bundle.snapshot.status)}</b>
                </div>
                <strong>{money(bundle.snapshot.dailyFolego)}</strong>
                <p>por dia</p>
                <div className="money-hero-foot">
                  <span>{money(bundle.snapshot.spendablePool)} até o próximo recebimento</span>
                  <span>{bundle.snapshot.daysUntilIncome == null ? 'recebimento não configurado' : bundle.snapshot.daysUntilIncome + ' dias'}</span>
                </div>
              </section>

              <button className="money-primary-action" onClick={() => setRegisterOpen(true)}><EuIcon name="plus" />Novo lançamento</button>

              <section className="money-metric-grid">
                <article><span><EuIcon name="wallet" /></span><small>Disponível</small><strong>{money(bundle.snapshot.liquidBalance)}</strong></article>
                <article><span><EuIcon name="shield" /></span><small>Protegido</small><strong>{money(bundle.snapshot.protectedBalance)}</strong></article>
                <article><span><EuIcon name="clock" /></span><small>Comprometido</small><strong>{money(bundle.snapshot.mandatoryOutflowsUntilIncome)}</strong></article>
                <article><span><EuIcon name="sparkles" /></span><small>Caixa livre</small><strong>{money(bundle.snapshot.cashHeadroom)}</strong></article>
              </section>

              <section className="money-section-card">
                <div className="money-section-heading">
                  <div><small>ORÇAMENTO VARIÁVEL</small><h2>Seu mês em uma linha</h2></div>
                  <strong>{budgetProgress}%</strong>
                </div>
                <div className="money-budget-bar"><span style={{ width: budgetProgress + '%' }} /></div>
                <p>{money(bundle.snapshot.monthlyBudgetUsed)} usados de {money(bundle.snapshot.monthlyBudgetPlanned)}.</p>
              </section>

              <section className="money-section-card money-income-card">
                <span><EuIcon name="trend-up" /></span>
                <div>
                  <small>PRÓXIMO RECEBIMENTO</small>
                  <strong>{money(bundle.snapshot.nextIncomeAmount)}</strong>
                  <p>{bundle.snapshot.nextIncomeDate ? dateLabel(bundle.snapshot.nextIncomeDate) : 'Ainda não configurado'}</p>
                </div>
              </section>

              <section className="money-section">
                <div className="money-section-title"><div><small>AGORA</small><h2>Últimos movimentos</h2></div><button onClick={() => setView('movement')}>ver tudo</button></div>
                <TransactionList bundle={bundle} limit={6} />
              </section>
            </>
          )}

          {view === 'movement' && (
            <section className="money-section money-full-view">
              <div className="money-section-title">
                <div><small>MOVIMENTO</small><h2>O que entrou e saiu</h2><p>Histórico vindo direto do seu banco financeiro.</p></div>
                <button className="money-small-action" onClick={() => setRegisterOpen(true)}><EuIcon name="plus" />novo</button>
              </div>
              <TransactionList bundle={bundle} limit={30} />
            </section>
          )}

          {view === 'plan' && (
            <section className="money-section money-full-view">
              <div className="money-section-title"><div><small>PLANO</small><h2>Planejamento do mês</h2><p>Limites que alimentam alertas e o cálculo do seu fôlego.</p></div></div>
              <div className="money-plan-summary">
                <div><span>planejado</span><strong>{money(bundle.budgetItems.reduce((sum, item) => sum + item.plannedAmount, 0))}</strong></div>
                <div><span>categorias</span><strong>{bundle.budgetItems.length}</strong></div>
                <div><span>uso atual</span><strong>{budgetProgress}%</strong></div>
              </div>
              <div className="money-plan-list">
                {bundle.budgetItems.map((item) => (
                  <article key={item.categoryId}>
                    <span className="money-plan-icon"><EuIcon name="wallet" /></span>
                    <div><strong>{item.categoryPath}</strong><small>aviso {Math.round(item.warningThreshold * 100)}% · crítico {Math.round(item.criticalThreshold * 100)}%</small></div>
                    <b>{money(item.plannedAmount)}</b>
                  </article>
                ))}
                {!bundle.budgetItems.length && <div className="money-empty">Nenhum limite planejado para este mês.</div>}
              </div>
            </section>
          )}

          {view === 'wallet' && <MoneyWallet bundle={bundle} />}
          {view === 'more' && <MoneyMore bundle={bundle} onChanged={() => void refresh()} />}
        </>
      )}

      <footer className="money-footer">
        <div><span><EuIcon name="shield" /></span><p><strong>Fonte de verdade financeira</strong> · os números vêm do mesmo Supabase do FÔLEGO, protegidos por autenticação e RLS.</p></div>
        {bundle && <button onClick={() => void signOutMoney()}>sair da conta financeira</button>}
      </footer>

      {bundle && registerOpen && (
        <MoneyRegister
          bundle={bundle}
          onClose={() => setRegisterOpen(false)}
          onSaved={() => { setRegisterOpen(false); void refresh() }}
        />
      )}
    </div>
  )
}

function TransactionList({ bundle, limit }: { bundle: MoneyBundle; limit: number }) {
  const categoryName = useMemo(() => {
    const all = [...bundle.expenseCategories, ...bundle.incomeCategories]
    return new Map(all.map((item) => [item.id, item.path]))
  }, [bundle])

  const rows = bundle.transactions.slice(0, limit)
  if (!rows.length) return <div className="money-empty">Nenhum movimento encontrado ainda.</div>

  return (
    <div className="money-transactions">
      {rows.map((row) => {
        const sign = eventSign(row.event_type)
        return (
          <article key={row.id}>
            <span className={'money-event-icon ' + (sign > 0 ? 'income' : 'expense')}><EuIcon name={sign > 0 ? 'trend-up' : 'trend-down'} /></span>
            <div><strong>{row.description}</strong><small>{eventLabel(row.event_type)}{row.category_id && categoryName.get(row.category_id) ? ' · ' + categoryName.get(row.category_id) : ''} · {dateLabel(row.occurred_at)}</small></div>
            <b className={sign > 0 ? 'income' : 'expense'}>{sign > 0 ? '+' : '−'} {money(Math.abs(row.amount))}</b>
          </article>
        )
      })}
    </div>
  )
}

function MoneyWallet({ bundle }: { bundle: MoneyBundle }) {
  return (
    <section className="money-section money-full-view">
      <div className="money-section-title"><div><small>CARTEIRA</small><h2>Tudo que compõe sua vida financeira</h2><p>Contas, cartões, dívidas, recorrências e metas em uma visão só.</p></div></div>

      <div className="money-wallet-block">
        <h3>Contas <span>{bundle.accounts.length}</span></h3>
        <div className="money-wallet-grid">
          {bundle.accounts.map((item) => <article key={item.id}><span><EuIcon name="wallet" /></span><div><strong>{item.name}</strong><small>{item.institution || item.type || 'conta'}</small></div></article>)}
        </div>
      </div>

      <div className="money-wallet-block">
        <h3>Cartões <span>{bundle.cards.length}</span></h3>
        <div className="money-card-grid">
          {bundle.cards.map((card) => (
            <article key={card.id}>
              <small>{card.issuer || card.brand || 'CARTÃO'}</small>
              <strong>{card.name}</strong>
              <p>{card.last_four ? '•••• ' + card.last_four : 'cartão ativo'}</p>
              <div><span>fecha dia {card.closing_day || '—'}</span><span>vence dia {card.due_day || '—'}</span></div>
              <b>{money(card.personal_limit ?? card.issuer_limit)}</b>
            </article>
          ))}
          {!bundle.cards.length && <div className="money-empty">Nenhum cartão ativo.</div>}
        </div>
      </div>

      <div className="money-wallet-block">
        <h3>Dívidas <span>{bundle.debts.length}</span></h3>
        <div className="money-simple-list">
          {bundle.debts.map((debt) => (
            <article key={debt.id}>
              <span><EuIcon name="clock" /></span>
              <div><strong>{debt.name}</strong><small>{debt.creditor || debt.debt_type || 'dívida'} · {debt.total_installments || '—'} parcelas</small></div>
              <b>{money(debt.opening_balance || debt.original_amount)}</b>
            </article>
          ))}
          {!bundle.debts.length && <div className="money-empty">Nenhuma dívida ativa cadastrada.</div>}
        </div>
      </div>

      <div className="money-wallet-block">
        <h3>Recorrências <span>{bundle.recurring.length}</span></h3>
        <div className="money-simple-list">
          {bundle.recurring.map((item) => (
            <article key={item.id}>
              <span><EuIcon name="refresh" /></span>
              <div><strong>{item.name}</strong><small>{item.item_type} · {item.frequency}{item.day_of_month ? ' · dia ' + item.day_of_month : ''}</small></div>
              <b>{money(item.amount)}</b>
            </article>
          ))}
          {!bundle.recurring.length && <div className="money-empty">Nenhuma recorrência ativa.</div>}
        </div>
      </div>

      <div className="money-wallet-block">
        <h3>Metas <span>{bundle.goals.length}</span></h3>
        <div className="money-goals">
          {bundle.goals.map((goal) => {
            const pct = goal.target > 0 ? Math.min(100, Math.round((goal.contributed / goal.target) * 100)) : 0
            return (
              <article key={goal.id}>
                <div><strong>{goal.name}</strong><span>{pct}%</span></div>
                <div className="money-goal-bar"><span style={{ width: pct + '%' }} /></div>
                <p>{money(goal.contributed)} de {money(goal.target)}{goal.target_date ? ' · alvo ' + dateLabel(goal.target_date) : ''}</p>
              </article>
            )
          })}
          {!bundle.goals.length && <div className="money-empty">Nenhuma meta financeira ativa.</div>}
        </div>
      </div>
    </section>
  )
}

function MoneyLogin({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!email.trim() || password.length < 6) return
    setBusy(true)
    setError('')
    try {
      await signInMoney(email.trim(), password)
      onSignedIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="v2-page money-page">
      <BrandTop />
      <section className="money-login">
        <span className="money-login-mark"><EuIcon name="wallet" /></span>
        <Tag tone="cobalt">DINHEIRO NO EU</Tag>
        <h1>Seu FÔLEGO<br />mora aqui agora.</h1>
        <p>Entre com a mesma conta que você já usava no FÔLEGO. Seus dados continuam no mesmo lugar; só a casa mudou.</p>
        <form onSubmit={submit}>
          <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
          <label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
          {error && <small>{error}</small>}
          <button disabled={busy || !email.trim() || password.length < 6}>{busy ? 'Entrando…' : 'Entrar no Dinheiro'}</button>
        </form>
        <div className="money-login-note"><EuIcon name="shield" /><span>O EU usa uma chave pública do Supabase; o acesso aos seus dados continua limitado pelas regras de segurança da sua conta.</span></div>
      </section>
    </div>
  )
}

function MoneyRegister({ bundle, onClose, onSaved }: { bundle: MoneyBundle; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState(bundle.accounts[0]?.id || '')
  const [categoryId, setCategoryId] = useState(bundle.expenseCategories[0]?.id || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const categories = type === 'expense' ? bundle.expenseCategories : bundle.incomeCategories

  function switchType(next: 'expense' | 'income') {
    setType(next)
    const nextCategories = next === 'expense' ? bundle.expenseCategories : bundle.incomeCategories
    setCategoryId(nextCategories[0]?.id || '')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = Number(amount.replace(/\./g, '').replace(',', '.'))
    if (!description.trim() || !accountId || !categoryId || !Number.isFinite(parsed) || parsed <= 0) {
      setError('Preencha descrição, valor, conta e categoria.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await registerMoneyMovement({ type, spaceId: bundle.space.id, accountId, categoryId, amount: parsed, description: description.trim() })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui registrar agora.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="money-sheet-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className="money-sheet" role="dialog" aria-modal="true">
        <div className="money-sheet-handle" />
        <div className="money-sheet-head"><div><small>DINHEIRO</small><h2>Registrar agora</h2></div><button onClick={onClose}><EuIcon name="x" /></button></div>
        <div className="money-kind-switch">
          <button className={type === 'expense' ? 'active' : ''} onClick={() => switchType('expense')}>Despesa</button>
          <button className={type === 'income' ? 'active' : ''} onClick={() => switchType('income')}>Receita</button>
        </div>
        <form onSubmit={submit}>
          <label>Descrição<input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={type === 'expense' ? 'Ex.: Restaurante' : 'Ex.: Trabalho extra'} /></label>
          <label>Valor<div className="money-value-input"><span>R$</span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" /></div></label>
          <label>Conta<select value={accountId} onChange={(e) => setAccountId(e.target.value)}>{bundle.accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Categoria<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>{categories.map((item: MoneyCategory) => <option key={item.id} value={item.id}>{item.path}</option>)}</select></label>
          {error && <small className="money-form-error">{error}</small>}
          <button className="money-submit" disabled={busy}>{busy ? 'Registrando…' : 'Registrar'}</button>
        </form>
      </section>
    </div>
  )
}
