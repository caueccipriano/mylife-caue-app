import { useEffect, useMemo, useState } from 'react'
import {
  copyMoneyBudgetMonth,
  loadMoneyBudgetOverview,
  type MoneyBudgetItem,
  type MoneyBudgetOverviewRow,
  type MoneyBundle,
} from './folegoNative'
import { EuIcon } from './v2Ui'

function monthKey(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), '01'].join('-')
}

function shiftMonth(value: string, delta: number) {
  const [year, month] = value.split('-').map(Number)
  return monthKey(new Date(year, month - 1 + delta, 1))
}

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(value)
}

function budgetItem(row: MoneyBudgetOverviewRow): MoneyBudgetItem {
  return {
    categoryId: row.categoryId,
    categoryPath: [row.parentName, row.categoryName].filter(Boolean).join(' > '),
    plannedAmount: row.plannedAmount,
    warningThreshold: row.warningThreshold,
    criticalThreshold: row.criticalThreshold,
  }
}

function statusCopy(status: string) {
  if (status === 'exceeded') return 'estourou'
  if (status === 'warning') return 'atenção'
  if (status === 'ok') return 'no plano'
  return 'sem limite'
}

export default function MoneyPlanPanel({
  bundle,
  revision,
  onEditBudget,
}: {
  bundle: MoneyBundle
  revision: number
  onEditBudget: (item: MoneyBudgetItem | null, periodMonth: string) => void
}) {
  const currentMonth = monthKey()
  const [periodMonth, setPeriodMonth] = useState(currentMonth)
  const [rows, setRows] = useState<MoneyBudgetOverviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [copying, setCopying] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      setRows(await loadMoneyBudgetOverview(bundle.space.id, periodMonth))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui carregar este planejamento.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [bundle.space.id, periodMonth, revision])

  const leafRows = useMemo(
    () => rows.filter((row) => row.budgetSource !== 'aggregate'),
    [rows],
  )
  const visibleRows = useMemo(
    () => leafRows
      .filter((row) => row.plannedAmount > 0 || row.actualAmount > 0 || row.isRecurring)
      .sort((a, b) => {
        if (a.status === 'exceeded' && b.status !== 'exceeded') return -1
        if (b.status === 'exceeded' && a.status !== 'exceeded') return 1
        if (a.status === 'warning' && b.status === 'ok') return -1
        if (b.status === 'warning' && a.status === 'ok') return 1
        return b.actualAmount - a.actualAmount
      }),
    [leafRows],
  )

  const planned = leafRows.reduce((sum, row) => sum + row.plannedAmount, 0)
  const actual = leafRows.reduce((sum, row) => sum + row.actualAmount, 0)
  const remaining = planned - actual
  const usage = planned > 0 ? Math.round((actual / planned) * 100) : 0
  const previousMonth = shiftMonth(periodMonth, -1)

  async function copyPrevious() {
    if (planned > 0 && !window.confirm('Copiar o mês anterior para este mês? Categorias iguais terão seus limites substituídos.')) return
    if (planned <= 0 && !window.confirm('Copiar os limites do mês anterior para ' + monthLabel(periodMonth) + '?')) return
    setCopying(true)
    setError('')
    setNotice('')
    try {
      const count = await copyMoneyBudgetMonth(bundle.space.id, previousMonth, periodMonth)
      setNotice(count + (count === 1 ? ' categoria copiada.' : ' categorias copiadas.'))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui copiar o orçamento anterior.')
    } finally {
      setCopying(false)
    }
  }

  return (
    <section className="money-section money-full-view money-plan-v38">
      <div className="money-section-title">
        <div><small>PLANO</small><h2>Planejamento mensal</h2><p>Planejado × realizado, mês por mês.</p></div>
        <button className="money-small-action" onClick={() => onEditBudget(null, periodMonth)}><EuIcon name="plus" />categoria</button>
      </div>

      <div className="money-month-nav">
        <button onClick={() => setPeriodMonth(shiftMonth(periodMonth, -1))} aria-label="Mês anterior">‹</button>
        <div><small>PLANEJANDO</small><strong>{monthLabel(periodMonth)}</strong></div>
        <button onClick={() => setPeriodMonth(shiftMonth(periodMonth, 1))} aria-label="Próximo mês">›</button>
      </div>

      <div className="money-plan-toolbar">
        <button onClick={() => void copyPrevious()} disabled={copying}>
          <EuIcon name="refresh" />{copying ? 'copiando…' : 'copiar ' + monthLabel(previousMonth)}
        </button>
        {periodMonth !== currentMonth && <button onClick={() => setPeriodMonth(currentMonth)}>voltar para este mês</button>}
      </div>

      {notice && <div className="money-plan-notice">{notice}</div>}
      {error && <div className="money-plan-notice is-error">{error}</div>}

      <div className="money-plan-summary money-plan-summary-v38">
        <div><span>planejado</span><strong>{money(planned)}</strong></div>
        <div><span>realizado</span><strong>{money(actual)}</strong></div>
        <div className={remaining < 0 ? 'is-negative' : ''}><span>{remaining < 0 ? 'excedido' : 'restante'}</span><strong>{money(Math.abs(remaining))}</strong></div>
        <div><span>uso</span><strong>{usage}%</strong></div>
      </div>

      <div className="money-plan-total-bar" aria-label={'Uso do orçamento ' + usage + '%'}>
        <span style={{ width: Math.min(100, usage) + '%' }} className={usage > 100 ? 'is-over' : usage >= 70 ? 'is-warning' : ''} />
      </div>

      {loading ? (
        <div className="money-loading"><span /><p>Carregando {monthLabel(periodMonth)}…</p></div>
      ) : (
        <div className="money-plan-compare-list">
          {visibleRows.map((row) => {
            const pct = row.plannedAmount > 0 ? Math.round((row.actualAmount / row.plannedAmount) * 100) : 0
            return (
              <article key={row.categoryId} className={'money-budget-compare is-' + row.status}>
                <div className="money-budget-compare-head">
                  <div>
                    <small>{row.parentName || (row.essential ? 'ESSENCIAL' : 'VARIÁVEL')}</small>
                    <strong>{row.categoryName}</strong>
                  </div>
                  <button onClick={() => onEditBudget(budgetItem(row), periodMonth)} aria-label={'Editar ' + row.categoryName}><EuIcon name="arrow-right" /></button>
                </div>
                <div className="money-budget-numbers">
                  <span><small>planejado</small><b>{money(row.plannedAmount)}</b></span>
                  <span><small>realizado</small><b>{money(row.actualAmount)}</b></span>
                  <span><small>{row.remainingAmount < 0 ? 'passou' : 'resta'}</small><b>{money(Math.abs(row.remainingAmount))}</b></span>
                </div>
                <div className="money-budget-row-bar"><span style={{ width: Math.min(100, pct) + '%' }} /></div>
                <p>{statusCopy(row.status)}{row.isRecurring ? ' · limite recorrente' : ''}{row.plannedAmount > 0 ? ' · ' + pct + '%' : ''}</p>
              </article>
            )
          })}
          {!visibleRows.length && (
            <div className="money-empty money-empty-action">
              <p>Nada planejado ou realizado neste mês ainda.</p>
              <button onClick={() => onEditBudget(null, periodMonth)}><EuIcon name="plus" />Planejar primeira categoria</button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
