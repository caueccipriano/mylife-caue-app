import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  loadMoneyInvoiceSummaries,
  loadMoneyProjection,
  simulateMoneySpend,
  type MoneyBundle,
  type MoneyInvoiceSummary,
  type MoneyProjection,
} from './folegoNative'
import { EuIcon } from './v2Ui'

type Horizon = 3 | 6 | 12 | 24

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(value)
}

function monthLabel(value?: string | null) {
  if (!value) return '—'
  const [year, month] = value.slice(0, 7).split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(new Date(year, month - 1, 1))
}

function dateLabel(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value + 'T12:00:00'))
}

function parseMoney(value: string) {
  const normalized = value.trim().replace(/./g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export default function MoneyFuturePanel({
  bundle,
  revision,
}: {
  bundle: MoneyBundle
  revision: number
}) {
  const [horizon, setHorizon] = useState<Horizon>(6)
  const [projection, setProjection] = useState<MoneyProjection | null>(null)
  const [invoices, setInvoices] = useState<MoneyInvoiceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [spend, setSpend] = useState('')
  const [checking, setChecking] = useState(false)
  const [spendResult, setSpendResult] = useState<{
    verdict: 'yes' | 'caution' | 'no'
    amount: number
    minimumBalance: number
    endingBalance: number
    baseMinimum: number
  } | null>(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [nextProjection, nextInvoices] = await Promise.all([
        loadMoneyProjection(bundle.space.id, horizon),
        loadMoneyInvoiceSummaries(bundle.space.id, bundle.cards),
      ])
      setProjection(nextProjection)
      setInvoices(nextInvoices)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui montar sua projeção.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [bundle.space.id, horizon, revision, bundle.cards.length])

  const activeInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.invoiceId || invoice.amountDue > 0),
    [invoices],
  )

  async function checkSpend(event: FormEvent) {
    event.preventDefault()
    const amount = parseMoney(spend)
    if (amount <= 0) {
      setError('Digite um valor maior que zero para simular.')
      return
    }
    setChecking(true)
    setError('')
    try {
      const simulated = await simulateMoneySpend(bundle.space.id, amount, horizon)
      const minimumBalance = simulated.summary.minimumBalance
      const safeNow = amount <= Math.max(bundle.snapshot.spendablePool, 0)
      const verdict: 'yes' | 'caution' | 'no' =
        minimumBalance < 0 ? 'no' : safeNow ? 'yes' : 'caution'
      setSpendResult({
        verdict,
        amount,
        minimumBalance,
        endingBalance: simulated.summary.endingBalance,
        baseMinimum: projection?.summary.minimumBalance ?? 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui simular essa compra.')
    } finally {
      setChecking(false)
    }
  }

  const maxAbsClosing = Math.max(
    1,
    ...(projection?.months.map((month) => Math.abs(month.closingBalance)) || [1]),
  )

  return (
    <section className="money-section money-full-view money-future-v38">
      <div className="money-section-title">
        <div><small>FUTURO</small><h2>Seu caixa antes de acontecer</h2><p>Salário, orçamento, recorrências, cartões e dívidas numa projeção só.</p></div>
      </div>

      <div className="money-horizon-switch" aria-label="Horizonte da projeção">
        {([3, 6, 12, 24] as Horizon[]).map((value) => (
          <button key={value} className={horizon === value ? 'active' : ''} onClick={() => setHorizon(value)}>{value}m</button>
        ))}
      </div>

      <section className="money-can-spend">
        <div className="money-can-spend-copy">
          <small>POSSO GASTAR?</small>
          <h3>Teste antes de comprar.</h3>
          <p>O EU coloca a compra na sua projeção e olha o pior saldo dos próximos {horizon} meses.</p>
        </div>
        <form onSubmit={checkSpend}>
          <div className="money-can-spend-input"><span>R$</span><input inputMode="decimal" value={spend} onChange={(e) => setSpend(e.target.value)} placeholder="300,00" /></div>
          <button disabled={checking}>{checking ? 'calculando…' : 'simular'}</button>
        </form>
        {spendResult && (
          <div className={'money-spend-result is-' + spendResult.verdict}>
            <span className="money-spend-result-icon"><EuIcon name={spendResult.verdict === 'yes' ? 'sparkles' : spendResult.verdict === 'caution' ? 'help' : 'clock'} /></span>
            <div>
              <small>{spendResult.verdict === 'yes' ? 'SIM' : spendResult.verdict === 'caution' ? 'COM CAUTELA' : 'MELHOR NÃO'}</small>
              <strong>{spendResult.verdict === 'yes'
                ? 'A projeção continua positiva.'
                : spendResult.verdict === 'caution'
                  ? 'Cabe no futuro, mas aperta seu Fôlego atual.'
                  : 'Essa compra leva sua projeção para o negativo.'}</strong>
              <p>Pior saldo depois da compra: {money(spendResult.minimumBalance)} · saldo final: {money(spendResult.endingBalance)}.</p>
            </div>
          </div>
        )}
      </section>

      {error && <div className="money-plan-notice is-error">{error}</div>}

      {loading || !projection ? (
        <div className="money-loading"><span /><p>Calculando seu futuro…</p></div>
      ) : (
        <>
          <div className="money-future-summary">
            <article className={projection.summary.minimumBalance < 0 ? 'is-negative' : ''}>
              <small>PIOR SALDO</small><strong>{money(projection.summary.minimumBalance)}</strong>
              <span>{projection.summary.criticalMonth ? 'negativo em ' + monthLabel(projection.summary.criticalMonth) : 'sem mês negativo'}</span>
            </article>
            <article><small>SALDO EM {horizon}M</small><strong>{money(projection.summary.endingBalance)}</strong><span>partindo de {money(projection.openingBalance)}</span></article>
            <article><small>RESERVAS / INVEST.</small><strong>{money(projection.summary.projectedSavings)}</strong><span>projetado no período</span></article>
          </div>

          <div className="money-projection-list">
            {projection.months.map((month) => {
              const outflows = month.directExpenses + month.recurringExpenses + month.cardInstallments + month.debts + month.reserveTransfers + month.investments + month.otherOutflows
              const width = Math.max(4, Math.round((Math.abs(month.closingBalance) / maxAbsClosing) * 100))
              return (
                <article key={month.month} className={month.closingBalance < 0 ? 'is-negative' : ''}>
                  <div className="money-projection-head">
                    <div><small>{monthLabel(month.month)}</small><strong>{money(month.closingBalance)}</strong></div>
                    <span className={month.netChange >= 0 ? 'positive' : 'negative'}>{month.netChange >= 0 ? '+' : '−'} {money(Math.abs(month.netChange))}</span>
                  </div>
                  <div className="money-projection-balance"><span style={{ width: width + '%' }} /></div>
                  <div className="money-projection-breakdown">
                    <span><small>entra</small><b>{money(month.income + month.otherInflows)}</b></span>
                    <span><small>sai</small><b>{money(outflows)}</b></span>
                    <span><small>cartões</small><b>{money(month.cardInstallments)}</b></span>
                    <span><small>dívidas</small><b>{money(month.debts)}</b></span>
                  </div>
                  {!!month.categories.length && <p>{month.categories.slice(0, 3).map((category) => category.name + ' ' + money(category.amount)).join(' · ')}</p>}
                </article>
              )
            })}
          </div>

          <div className="money-wallet-block money-invoices-v38">
            <h3>Faturas agora <span>{activeInvoices.length}</span></h3>
            <div className="money-invoice-list">
              {activeInvoices.map((invoice) => (
                <article key={invoice.cardId}>
                  <div className="money-invoice-top">
                    <div><small>{invoice.referenceMonth ? monthLabel(invoice.referenceMonth) : 'FATURA ATUAL'}</small><strong>{invoice.cardName}</strong></div>
                    <b>{money(invoice.amountDue)}</b>
                  </div>
                  <div className="money-invoice-meta">
                    <span>fecha {dateLabel(invoice.closingDate)}</span><span>vence {dateLabel(invoice.dueDate)}</span>
                  </div>
                  <div className="money-invoice-numbers">
                    <span><small>compras</small><b>{money(invoice.grossPurchases)}</b></span>
                    <span><small>pagamentos</small><b>{money(invoice.payments)}</b></span>
                    <span><small>créditos</small><b>{money(invoice.credits)}</b></span>
                  </div>
                </article>
              ))}
              {!activeInvoices.length && <div className="money-empty">Nenhuma fatura aberta agora.</div>}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
