import { type FormEvent, useMemo, useState } from 'react'
import {
  configureMoneyIncome,
  configureMoneyRecurringExpense,
  createMoneyAccount,
  createMoneyCard,
  setMoneyBudgetItem,
  type MoneyBudgetItem,
  type MoneyBundle,
} from './folegoNative'
import { EuIcon } from './v2Ui'

export type MoneySetupKind = 'budget' | 'income' | 'recurring' | 'account' | 'reserve' | 'card'

function parseMoneyInput(value: string) {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function validDay(value: string) {
  const day = Number(value)
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : 0
}

const labels: Record<MoneySetupKind, { eyebrow: string; title: string; submit: string }> = {
  budget: { eyebrow: 'PLANEJAMENTO', title: 'Planejar categoria', submit: 'Salvar planejamento' },
  income: { eyebrow: 'RECEBIMENTO', title: 'Configurar entrada recorrente', submit: 'Salvar recebimento' },
  recurring: { eyebrow: 'CONTA FIXA', title: 'Adicionar recorrência', submit: 'Salvar recorrência' },
  account: { eyebrow: 'CONTA', title: 'Adicionar conta', submit: 'Salvar conta' },
  reserve: { eyebrow: 'RESERVA', title: 'Adicionar dinheiro protegido', submit: 'Salvar reserva' },
  card: { eyebrow: 'CARTÃO', title: 'Adicionar cartão', submit: 'Salvar cartão' },
}

export default function MoneySetupSheet({
  bundle,
  kind,
  initialBudgetItem,
  periodMonth,
  onClose,
  onSaved,
}: {
  bundle: MoneyBundle
  kind: MoneySetupKind
  initialBudgetItem?: MoneyBudgetItem | null
  periodMonth?: string
  onClose: () => void
  onSaved: () => void
}) {
  const initialBudget = initialBudgetItem || null
  const availableBudgetCategories = useMemo(() => {
    const discretionary = bundle.expenseCategories.filter((item) => !item.essential)
    const base = discretionary.length ? discretionary : bundle.expenseCategories
    if (!initialBudget?.categoryId || base.some((item) => item.id === initialBudget.categoryId)) return base
    const current = bundle.expenseCategories.find((item) => item.id === initialBudget.categoryId)
    return current ? [current, ...base] : base
  }, [bundle, initialBudget?.categoryId])

  const [name, setName] = useState(kind === 'income' ? 'Salário' : kind === 'recurring' ? '' : kind === 'account' ? '' : kind === 'reserve' ? 'Reserva' : kind === 'card' ? '' : '')
  const [institution, setInstitution] = useState('')
  const [amount, setAmount] = useState(initialBudget ? String(initialBudget.plannedAmount).replace('.', ',') : '')
  const [day, setDay] = useState(kind === 'income' ? '15' : kind === 'recurring' ? '10' : '')
  const [accountId, setAccountId] = useState(bundle.accounts[0]?.id || '')
  const [categoryId, setCategoryId] = useState(initialBudget?.categoryId || availableBudgetCategories[0]?.id || '')
  const [warning, setWarning] = useState(initialBudget ? String(Math.round(initialBudget.warningThreshold * 100)) : '70')
  const [critical, setCritical] = useState(initialBudget ? String(Math.round(initialBudget.criticalThreshold * 100)) : '90')
  const [closingDay, setClosingDay] = useState('23')
  const [dueDay, setDueDay] = useState('5')
  const [invoice, setInvoice] = useState('')
  const [invoiceDueDate, setInvoiceDueDate] = useState('')
  const [limit, setLimit] = useState('')
  const [lastFour, setLastFour] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const meta = labels[kind]

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)

    try {
      if (kind === 'budget') {
        const plannedAmount = parseMoneyInput(amount)
        const warningThreshold = Number(warning) / 100
        const criticalThreshold = Number(critical) / 100
        if (!categoryId || plannedAmount < 0) throw new Error('Escolha a categoria e informe um valor válido.')
        if (!(warningThreshold > 0 && warningThreshold <= 1) || !(criticalThreshold > warningThreshold && criticalThreshold <= 1)) {
          throw new Error('Use percentuais válidos. Ex.: aviso 70% e crítico 90%.')
        }
        await setMoneyBudgetItem({
          spaceId: bundle.space.id,
          categoryId,
          plannedAmount,
          warningThreshold,
          criticalThreshold,
          periodMonth,
        })
      }

      if (kind === 'income') {
        const parsedAmount = parseMoneyInput(amount)
        const parsedDay = validDay(day)
        if (!name.trim() || parsedAmount <= 0 || !parsedDay || !accountId) throw new Error('Preencha nome, valor, dia e conta.')
        await configureMoneyIncome({
          spaceId: bundle.space.id,
          name: name.trim(),
          amount: parsedAmount,
          dayOfMonth: parsedDay,
          accountId,
          categoryId: bundle.incomeCategories[0]?.id,
        })
      }

      if (kind === 'recurring') {
        const parsedAmount = parseMoneyInput(amount)
        const parsedDay = validDay(day)
        if (!name.trim() || parsedAmount <= 0 || !parsedDay || !accountId || !categoryId) throw new Error('Preencha nome, valor, vencimento, conta e categoria.')
        await configureMoneyRecurringExpense({
          spaceId: bundle.space.id,
          name: name.trim(),
          amount: parsedAmount,
          dayOfMonth: parsedDay,
          categoryId,
          accountId,
        })
      }

      if (kind === 'account') {
        const openingBalance = parseMoneyInput(amount)
        if (!name.trim() || openingBalance < 0) throw new Error('Informe nome da conta e um saldo válido.')
        await createMoneyAccount({
          spaceId: bundle.space.id,
          name: name.trim(),
          openingBalance,
          institution: institution.trim() || undefined,
          type: 'checking',
          availableForSpending: true,
        })
      }

      if (kind === 'reserve') {
        const openingBalance = parseMoneyInput(amount)
        if (openingBalance <= 0) throw new Error('Informe quanto já está separado na reserva.')
        await createMoneyAccount({
          spaceId: bundle.space.id,
          name: name.trim() || 'Reserva',
          openingBalance,
          institution: institution.trim() || undefined,
          type: 'reserve',
          availableForSpending: false,
        })
      }

      if (kind === 'card') {
        const close = validDay(closingDay)
        const due = validDay(dueDay)
        const currentInvoiceBalance = parseMoneyInput(invoice)
        const personalLimit = limit.trim() ? parseMoneyInput(limit) : null
        if (!name.trim() || !close || !due || !accountId) throw new Error('Preencha nome, fechamento, vencimento e conta de pagamento.')
        if (currentInvoiceBalance > 0 && !invoiceDueDate) throw new Error('Informe a data de vencimento da fatura atual.')
        await createMoneyCard({
          spaceId: bundle.space.id,
          name: name.trim(),
          closingDay: close,
          dueDay: due,
          paymentAccountId: accountId,
          issuer: institution.trim() || undefined,
          lastFour: lastFour.trim() || undefined,
          personalLimit,
          currentInvoiceBalance,
          currentInvoiceDueDate: invoiceDueDate || null,
        })
      }

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui salvar essa configuração.')
    } finally {
      setBusy(false)
    }
  }

  const expenseCategories = kind === 'budget' ? availableBudgetCategories : bundle.expenseCategories

  return (
    <div className="money-sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="money-sheet money-setup-sheet" role="dialog" aria-modal="true" aria-label={meta.title}>
        <div className="money-sheet-handle" />
        <div className="money-sheet-head">
          <div><small>{meta.eyebrow}</small><h2>{meta.title}</h2></div>
          <button type="button" onClick={onClose} aria-label="Fechar"><EuIcon name="x" /></button>
        </div>

        <form onSubmit={submit}>
          {kind === 'budget' && (
            <>
              <label>Categoria
                <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={Boolean(initialBudget)}>
                  {availableBudgetCategories.map((item) => <option key={item.id} value={item.id}>{item.path}</option>)}
                </select>
              </label>
              <label>Limite mensal
                <div className="money-value-input"><span>R$</span><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" /></div>
              </label>
              <div className="money-setup-two">
                <label>Aviso (%)
                  <input inputMode="numeric" value={warning} onChange={(event) => setWarning(event.target.value)} />
                </label>
                <label>Crítico (%)
                  <input inputMode="numeric" value={critical} onChange={(event) => setCritical(event.target.value)} />
                </label>
              </div>
              <p className="money-setup-hint">O valor salvo entra imediatamente no cálculo do orçamento e do seu Fôlego. Salvar 0 mantém a categoria no plano com limite zero.</p>
            </>
          )}

          {(kind === 'income' || kind === 'recurring') && (
            <>
              <label>Nome<input value={name} onChange={(event) => setName(event.target.value)} placeholder={kind === 'income' ? 'Ex.: Salário' : 'Ex.: Aluguel'} /></label>
              <label>Valor<div className="money-value-input"><span>R$</span><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" /></div></label>
              <label>{kind === 'income' ? 'Dia do recebimento' : 'Dia do vencimento'}<input inputMode="numeric" value={day} onChange={(event) => setDay(event.target.value)} /></label>
              <label>Conta<select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{bundle.accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              {kind === 'recurring' && <label>Categoria<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{expenseCategories.map((item) => <option key={item.id} value={item.id}>{item.path}</option>)}</select></label>}
              {kind === 'income' && <p className="money-setup-hint">Esse recebimento passa a alimentar a previsão de caixa e a quantidade de dias até a próxima entrada.</p>}
            </>
          )}

          {(kind === 'account' || kind === 'reserve') && (
            <>
              <label>Nome<input value={name} onChange={(event) => setName(event.target.value)} placeholder={kind === 'reserve' ? 'Reserva' : 'Ex.: Santander'} /></label>
              <label>Banco / instituição<input value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder="Opcional" /></label>
              <label>{kind === 'reserve' ? 'Valor já separado' : 'Saldo disponível hoje'}<div className="money-value-input"><span>R$</span><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" /></div></label>
              <p className="money-setup-hint">{kind === 'reserve' ? 'Reserva entra no patrimônio, mas fica protegida e não aparece como dinheiro livre para gastar.' : 'Saldo inicial ancora o caixa atual; ele não é tratado como receita.'}</p>
            </>
          )}

          {kind === 'card' && (
            <>
              <label>Nome do cartão<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: AMEX Gold" /></label>
              <label>Banco / emissor<input value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder="Opcional" /></label>
              <div className="money-setup-two">
                <label>Fecha dia<input inputMode="numeric" value={closingDay} onChange={(event) => setClosingDay(event.target.value)} /></label>
                <label>Vence dia<input inputMode="numeric" value={dueDay} onChange={(event) => setDueDay(event.target.value)} /></label>
              </div>
              <label>Conta que paga a fatura<select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{bundle.accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <div className="money-setup-two">
                <label>Final do cartão<input inputMode="numeric" maxLength={4} value={lastFour} onChange={(event) => setLastFour(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1234" /></label>
                <label>Limite pessoal<div className="money-value-input"><span>R$</span><input inputMode="decimal" value={limit} onChange={(event) => setLimit(event.target.value)} placeholder="Opcional" /></div></label>
              </div>
              <label>Fatura atual<div className="money-value-input"><span>R$</span><input inputMode="decimal" value={invoice} onChange={(event) => setInvoice(event.target.value)} placeholder="0,00" /></div></label>
              <label>Vencimento da fatura atual<input type="date" value={invoiceDueDate} onChange={(event) => setInvoiceDueDate(event.target.value)} /></label>
            </>
          )}

          {error && <small className="money-form-error">{error}</small>}
          <button className="money-submit" disabled={busy}>{busy ? 'Salvando…' : meta.submit}</button>
        </form>
      </section>
    </div>
  )
}
