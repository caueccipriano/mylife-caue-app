import { type FormEvent, type ReactNode, useMemo, useState } from 'react'
import {
  addMoneyGoalContribution,
  archiveMoneyAccount,
  archiveMoneyCard,
  archiveMoneyDebt,
  closeMoneyDebt,
  createMoneyDebt,
  createMoneyGoal,
  setMoneyRecurringActive,
  updateMoneyAccount,
  updateMoneyCard,
  updateMoneyDebt,
  updateMoneyGoal,
  updateMoneyRecurring,
  type MoneyAccount,
  type MoneyBundle,
  type MoneyCard,
  type MoneyDebt,
  type MoneyGoal,
  type MoneyRecurring,
} from './folegoNative'
import { EuIcon } from './v2Ui'

export type MoneyManageTarget =
  | { kind: 'account'; item: MoneyAccount }
  | { kind: 'card'; item: MoneyCard }
  | { kind: 'recurring'; item: MoneyRecurring }
  | { kind: 'goal'; item?: MoneyGoal | null }
  | { kind: 'goal-contribution'; item: MoneyGoal }
  | { kind: 'debt'; item?: MoneyDebt | null }

function parseMoney(value: string) {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function moneyInput(value?: number | null) {
  if (value == null) return ''
  return String(value).replace('.', ',')
}

function validDay(value: string) {
  const day = Number(value)
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : 0
}

export default function MoneyManageSheet({
  bundle,
  target,
  onClose,
  onSaved,
}: {
  bundle: MoneyBundle
  target: MoneyManageTarget
  onClose: () => void
  onSaved: () => void
}) {
  if (target.kind === 'account') return <AccountEditor bundle={bundle} item={target.item} onClose={onClose} onSaved={onSaved} />
  if (target.kind === 'card') return <CardEditor bundle={bundle} item={target.item} onClose={onClose} onSaved={onSaved} />
  if (target.kind === 'recurring') return <RecurringEditor bundle={bundle} item={target.item} onClose={onClose} onSaved={onSaved} />
  if (target.kind === 'goal') return <GoalEditor bundle={bundle} item={target.item || null} onClose={onClose} onSaved={onSaved} />
  if (target.kind === 'goal-contribution') return <GoalContribution bundle={bundle} item={target.item} onClose={onClose} onSaved={onSaved} />
  return <DebtEditor bundle={bundle} item={target.item || null} onClose={onClose} onSaved={onSaved} />
}

function SheetFrame({
  eyebrow,
  title,
  onClose,
  children,
}: {
  eyebrow: string
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="money-sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="money-sheet money-manage-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="money-sheet-handle" />
        <div className="money-sheet-head">
          <div><small>{eyebrow}</small><h2>{title}</h2></div>
          <button type="button" onClick={onClose} aria-label="Fechar"><EuIcon name="x" /></button>
        </div>
        {children}
      </section>
    </div>
  )
}

function AccountEditor({ bundle, item, onClose, onSaved }: { bundle: MoneyBundle; item: MoneyAccount; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item.name)
  const [institution, setInstitution] = useState(item.institution || '')
  const [type, setType] = useState(item.type || 'checking')
  const [available, setAvailable] = useState(item.available_for_spending !== false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return setError('Dê um nome para a conta.')
    setBusy(true); setError('')
    try {
      await updateMoneyAccount({ spaceId: bundle.space.id, accountId: item.id, name: name.trim(), institution, type, availableForSpending: available })
      onSaved()
    } catch (err) { setError(err instanceof Error ? err.message : 'Não consegui editar a conta.') } finally { setBusy(false) }
  }

  async function archive() {
    if (!window.confirm('Arquivar esta conta? Ela some da carteira, mas o histórico permanece.')) return
    setBusy(true); setError('')
    try { await archiveMoneyAccount(bundle.space.id, item.id); onSaved() }
    catch (err) { setError(err instanceof Error ? err.message : 'Não consegui arquivar a conta.') }
    finally { setBusy(false) }
  }

  return (
    <SheetFrame eyebrow="CONTA" title="Editar conta" onClose={onClose}>
      <form onSubmit={submit}>
        <label>Nome<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Banco / instituição<input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Opcional" /></label>
        <label>Tipo<select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="checking">Conta corrente</option><option value="savings">Poupança</option><option value="cash">Dinheiro</option><option value="reserve">Reserva</option><option value="benefit">Benefício</option><option value="investment">Investimento</option><option value="other">Outro</option>
        </select></label>
        <label className="money-toggle-row"><input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} /><span><strong>Disponível para gastar</strong><small>Desative para reservas e valores protegidos.</small></span></label>
        {error && <small className="money-form-error">{error}</small>}
        <button className="money-submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar alterações'}</button>
        <button type="button" className="money-danger-action" disabled={busy} onClick={archive}>Arquivar conta</button>
      </form>
    </SheetFrame>
  )
}

function CardEditor({ bundle, item, onClose, onSaved }: { bundle: MoneyBundle; item: MoneyCard; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item.name)
  const [issuer, setIssuer] = useState(item.issuer || '')
  const [brand, setBrand] = useState(item.brand || '')
  const [lastFour, setLastFour] = useState(item.last_four?.trim() || '')
  const [closingDay, setClosingDay] = useState(String(item.closing_day || ''))
  const [dueDay, setDueDay] = useState(String(item.due_day || ''))
  const [accountId, setAccountId] = useState(item.payment_account_id || bundle.accounts[0]?.id || '')
  const [limit, setLimit] = useState(moneyInput(item.personal_limit ?? item.issuer_limit))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const close = validDay(closingDay), due = validDay(dueDay)
    if (!name.trim() || !close || !due) return setError('Preencha nome, fechamento e vencimento.')
    const parsedLimit = limit.trim() ? parseMoney(limit) : null
    setBusy(true); setError('')
    try {
      await updateMoneyCard({ spaceId: bundle.space.id, cardId: item.id, name: name.trim(), closingDay: close, dueDay: due, paymentAccountId: accountId || null, issuer, brand, lastFour: lastFour || null, personalLimit: parsedLimit })
      onSaved()
    } catch (err) { setError(err instanceof Error ? err.message : 'Não consegui editar o cartão.') } finally { setBusy(false) }
  }

  async function archive() {
    if (!window.confirm('Arquivar este cartão? Compras e faturas anteriores continuam no histórico.')) return
    setBusy(true); setError('')
    try { await archiveMoneyCard(bundle.space.id, item.id); onSaved() }
    catch (err) { setError(err instanceof Error ? err.message : 'Não consegui arquivar o cartão.') }
    finally { setBusy(false) }
  }

  return (
    <SheetFrame eyebrow="CARTÃO" title="Editar cartão" onClose={onClose}>
      <form onSubmit={submit}>
        <label>Nome<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <div className="money-setup-two">
          <label>Emissor<input value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="Banco" /></label>
          <label>Bandeira<input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Amex, Visa…" /></label>
        </div>
        <div className="money-setup-two">
          <label>Fecha dia<input inputMode="numeric" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} /></label>
          <label>Vence dia<input inputMode="numeric" value={dueDay} onChange={(e) => setDueDay(e.target.value)} /></label>
        </div>
        <label>Conta que paga<select value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Sem conta definida</option>{bundle.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <div className="money-setup-two">
          <label>Final<input maxLength={4} inputMode="numeric" value={lastFour} onChange={(e) => setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))} /></label>
          <label>Limite pessoal<div className="money-value-input"><span>R$</span><input inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} /></div></label>
        </div>
        {error && <small className="money-form-error">{error}</small>}
        <button className="money-submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar alterações'}</button>
        <button type="button" className="money-danger-action" disabled={busy} onClick={archive}>Arquivar cartão</button>
      </form>
    </SheetFrame>
  )
}

function RecurringEditor({ bundle, item, onClose, onSaved }: { bundle: MoneyBundle; item: MoneyRecurring; onClose: () => void; onSaved: () => void }) {
  const categories = item.item_type === 'income' ? bundle.incomeCategories : bundle.expenseCategories
  const sourceInitial = item.card_id ? 'card:' + item.card_id : 'account:' + (item.account_id || bundle.accounts[0]?.id || '')
  const [name, setName] = useState(item.name)
  const [amount, setAmount] = useState(moneyInput(item.amount))
  const [day, setDay] = useState(item.day_of_month ? String(item.day_of_month) : '')
  const [categoryId, setCategoryId] = useState(item.category_id || categories[0]?.id || '')
  const [source, setSource] = useState(sourceInitial)
  const [certainty, setCertainty] = useState(item.certainty || 'confirmed')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const sources = useMemo(() => {
    const accounts = bundle.accounts.map((a) => ({ id: 'account:' + a.id, label: a.name }))
    if (item.item_type === 'income') return accounts
    return [...accounts, ...bundle.cards.map((c) => ({ id: 'card:' + c.id, label: 'Cartão · ' + c.name }))]
  }, [bundle, item.item_type])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseMoney(amount)
    const parsedDay = validDay(day)
    if (!name.trim() || parsed <= 0 || !parsedDay || !categoryId || !source) return setError('Preencha nome, valor, dia, categoria e origem.')
    const [sourceType, sourceId] = source.split(':')
    setBusy(true); setError('')
    try {
      await updateMoneyRecurring({
        spaceId: bundle.space.id,
        itemId: item.id,
        name: name.trim(),
        amount: parsed,
        dayOfMonth: parsedDay,
        categoryId,
        accountId: sourceType === 'account' ? sourceId : null,
        cardId: sourceType === 'card' ? sourceId : null,
        certainty,
        active: item.active !== false,
      })
      onSaved()
    } catch (err) { setError(err instanceof Error ? err.message : 'Não consegui editar a recorrência.') } finally { setBusy(false) }
  }

  async function toggleActive() {
    const next = item.active === false
    if (!window.confirm(next ? 'Reativar esta recorrência?' : 'Pausar esta recorrência? Ela deixa de entrar nas projeções futuras.')) return
    setBusy(true); setError('')
    try { await setMoneyRecurringActive(bundle.space.id, item.id, next); onSaved() }
    catch (err) { setError(err instanceof Error ? err.message : 'Não consegui alterar a recorrência.') }
    finally { setBusy(false) }
  }

  return (
    <SheetFrame eyebrow={item.item_type === 'income' ? 'RECEBIMENTO' : 'RECORRÊNCIA'} title="Editar recorrência" onClose={onClose}>
      <form onSubmit={submit}>
        <label>Nome<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Valor<div className="money-value-input"><span>R$</span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></div></label>
        <label>Dia do mês<input inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value)} /></label>
        <label>Categoria<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>{categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.path}</option>)}</select></label>
        <label>{item.item_type === 'income' ? 'Conta de recebimento' : 'Conta ou cartão'}<select value={source} onChange={(e) => setSource(e.target.value)}>{sources.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        <label>Confiança<select value={certainty} onChange={(e) => setCertainty(e.target.value)}><option value="confirmed">Confirmada</option><option value="expected">Esperada</option><option value="uncertain">Incerta</option></select></label>
        {error && <small className="money-form-error">{error}</small>}
        <button className="money-submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar alterações'}</button>
        <button type="button" className={item.active === false ? 'money-secondary-action' : 'money-danger-action'} disabled={busy} onClick={toggleActive}>{item.active === false ? 'Reativar recorrência' : 'Pausar recorrência'}</button>
      </form>
    </SheetFrame>
  )
}

function GoalEditor({ bundle, item, onClose, onSaved }: { bundle: MoneyBundle; item: MoneyGoal | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item?.name || '')
  const [target, setTarget] = useState(moneyInput(item?.target))
  const [targetDate, setTargetDate] = useState(item?.target_date || '')
  const [iconKey, setIconKey] = useState(item?.icon_key || 'piggy-bank')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseMoney(target)
    if (!name.trim() || parsed <= 0) return setError('Informe nome e valor-alvo.')
    setBusy(true); setError('')
    try {
      if (item) await updateMoneyGoal({ spaceId: bundle.space.id, goalId: item.id, name: name.trim(), target: parsed, targetDate: targetDate || null, iconKey, status: item.status || 'active' })
      else await createMoneyGoal({ spaceId: bundle.space.id, name: name.trim(), target: parsed, targetDate: targetDate || null, iconKey })
      onSaved()
    } catch (err) { setError(err instanceof Error ? err.message : 'Não consegui salvar a meta.') } finally { setBusy(false) }
  }

  async function setStatus(status: 'completed' | 'archived') {
    if (!item) return
    const message = status === 'completed' ? 'Marcar esta meta como concluída?' : 'Arquivar esta meta? Ela some da carteira, mas os aportes permanecem registrados.'
    if (!window.confirm(message)) return
    setBusy(true); setError('')
    try { await updateMoneyGoal({ spaceId: bundle.space.id, goalId: item.id, name: item.name, target: item.target, targetDate: item.target_date || null, iconKey: item.icon_key, status }); onSaved() }
    catch (err) { setError(err instanceof Error ? err.message : 'Não consegui alterar a meta.') }
    finally { setBusy(false) }
  }

  return (
    <SheetFrame eyebrow="META" title={item ? 'Editar meta' : 'Nova meta'} onClose={onClose}>
      <form onSubmit={submit}>
        <label>Nome<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Entrada do carro" /></label>
        <label>Valor-alvo<div className="money-value-input"><span>R$</span><input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} /></div></label>
        <label>Data-alvo<input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></label>
        <label>Ícone<select value={iconKey} onChange={(e) => setIconKey(e.target.value)}><option value="piggy-bank">Reserva</option><option value="car">Carro</option><option value="home">Casa</option><option value="plane">Viagem</option><option value="device-laptop">Tecnologia</option><option value="gift">Presente</option></select></label>
        {error && <small className="money-form-error">{error}</small>}
        <button className="money-submit" disabled={busy}>{busy ? 'Salvando…' : item ? 'Salvar alterações' : 'Criar meta'}</button>
        {item && item.status !== 'completed' && <button type="button" className="money-secondary-action" disabled={busy} onClick={() => void setStatus('completed')}>Marcar como concluída</button>}
        {item && <button type="button" className="money-danger-action" disabled={busy} onClick={() => void setStatus('archived')}>Arquivar meta</button>}
      </form>
    </SheetFrame>
  )
}

function GoalContribution({ bundle, item, onClose, onSaved }: { bundle: MoneyBundle; item: MoneyGoal; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseMoney(amount)
    if (parsed <= 0) return setError('Informe um aporte maior que zero.')
    setBusy(true); setError('')
    try { await addMoneyGoalContribution({ spaceId: bundle.space.id, goalId: item.id, amount: parsed, note }); onSaved() }
    catch (err) { setError(err instanceof Error ? err.message : 'Não consegui registrar o aporte.') }
    finally { setBusy(false) }
  }

  return (
    <SheetFrame eyebrow="APORTE" title={item.name} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="money-manage-context"><span>já guardado</span><strong>{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(item.contributed)}</strong></div>
        <label>Valor do aporte<div className="money-value-input"><span>R$</span><input autoFocus inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" /></div></label>
        <label>Nota<input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Opcional" /></label>
        <p className="money-setup-hint">Aportes são registros positivos e permanentes no histórico da meta.</p>
        {error && <small className="money-form-error">{error}</small>}
        <button className="money-submit" disabled={busy}>{busy ? 'Registrando…' : 'Registrar aporte'}</button>
      </form>
    </SheetFrame>
  )
}

function DebtEditor({ bundle, item, onClose, onSaved }: { bundle: MoneyBundle; item: MoneyDebt | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item?.name || '')
  const [creditor, setCreditor] = useState(item?.creditor || '')
  const [originalAmount, setOriginalAmount] = useState(moneyInput(item?.original_amount ?? item?.opening_balance))
  const [installments, setInstallments] = useState(item?.total_installments ? String(item.total_installments) : '')
  const [firstDue, setFirstDue] = useState(item?.first_due || '')
  const [accountId, setAccountId] = useState(item?.payment_account_id || bundle.accounts[0]?.id || '')
  const [startedOn, setStartedOn] = useState(item?.started_on || new Date().toISOString().slice(0,10))
  const [interest, setInterest] = useState(item?.interest_rate_monthly == null ? '' : String(item.interest_rate_monthly).replace('.', ','))
  const [debtType, setDebtType] = useState(item?.debt_type || 'other')
  const [notes, setNotes] = useState(item?.notes || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const amount = parseMoney(originalAmount)
    const count = installments.trim() ? Number(installments) : null
    const rate = interest.trim() ? parseMoney(interest) : null
    if (!name.trim() || !creditor.trim() || amount <= 0 || !firstDue) return setError('Preencha nome, credor, valor e primeira parcela.')
    if (count != null && (!Number.isInteger(count) || count < 1)) return setError('Número de parcelas inválido.')
    setBusy(true); setError('')
    try {
      const payload = { spaceId: bundle.space.id, name: name.trim(), creditor: creditor.trim(), originalAmount: amount, totalInstallments: count, firstDue, paymentAccountId: accountId || null, startedOn, interestRateMonthly: rate, debtType, notes }
      if (item) await updateMoneyDebt({ ...payload, debtId: item.id })
      else await createMoneyDebt(payload)
      onSaved()
    } catch (err) { setError(err instanceof Error ? err.message : 'Não consegui salvar a dívida.') } finally { setBusy(false) }
  }

  async function lifecycle(action: 'close' | 'archive') {
    if (!item) return
    const question = action === 'close' ? 'Marcar esta dívida como quitada?' : 'Arquivar esta dívida?'
    if (!window.confirm(question)) return
    setBusy(true); setError('')
    try {
      if (action === 'close') await closeMoneyDebt(bundle.space.id, item.id)
      else await archiveMoneyDebt(bundle.space.id, item.id)
      onSaved()
    } catch (err) { setError(err instanceof Error ? err.message : 'Não consegui alterar a dívida.') }
    finally { setBusy(false) }
  }

  return (
    <SheetFrame eyebrow="DÍVIDA" title={item ? 'Editar dívida' : 'Nova dívida'} onClose={onClose}>
      <form onSubmit={submit}>
        <label>Nome<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Empréstimo reforma" /></label>
        <label>Credor<input value={creditor} onChange={(e) => setCreditor(e.target.value)} placeholder="Banco ou pessoa" /></label>
        <label>Valor original<div className="money-value-input"><span>R$</span><input inputMode="decimal" value={originalAmount} onChange={(e) => setOriginalAmount(e.target.value)} /></div></label>
        <div className="money-setup-two">
          <label>Parcelas<input inputMode="numeric" value={installments} onChange={(e) => setInstallments(e.target.value)} /></label>
          <label>Juros a.m. (%)<input inputMode="decimal" value={interest} onChange={(e) => setInterest(e.target.value)} /></label>
        </div>
        <div className="money-setup-two">
          <label>Início<input type="date" value={startedOn} onChange={(e) => setStartedOn(e.target.value)} /></label>
          <label>1ª parcela<input type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} /></label>
        </div>
        <label>Conta de pagamento<select value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Sem conta definida</option>{bundle.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label>Tipo<select value={debtType} onChange={(e) => setDebtType(e.target.value)}><option value="loan">Empréstimo</option><option value="financing">Financiamento</option><option value="installment">Parcelamento</option><option value="personal">Pessoal</option><option value="other">Outro</option></select></label>
        <label>Notas<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></label>
        {error && <small className="money-form-error">{error}</small>}
        <button className="money-submit" disabled={busy}>{busy ? 'Salvando…' : item ? 'Salvar alterações' : 'Criar dívida'}</button>
        {item && item.status !== 'paid' && <button type="button" className="money-secondary-action" disabled={busy} onClick={() => void lifecycle('close')}>Marcar como quitada</button>}
        {item && <button type="button" className="money-danger-action" disabled={busy} onClick={() => void lifecycle('archive')}>Arquivar dívida</button>}
      </form>
    </SheetFrame>
  )
}
