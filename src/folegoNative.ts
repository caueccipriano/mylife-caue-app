import { createClient, type Session } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://ycumrvkwqizlnehelhek.supabase.co'
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_8K5nfby9LmhIJh3B-knQAg_fSUqItLL'

export const moneySupabase = createClient(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'eu-money-auth-v1',
  },
})

export type MoneySnapshot = {
  asOfDate: string
  nextIncomeDate: string | null
  nextIncomeAmount: number
  daysUntilIncome: number | null
  liquidBalance: number
  protectedBalance: number
  mandatoryOutflowsUntilIncome: number
  cashHeadroom: number
  monthlyBudgetPlanned: number
  monthlyBudgetUsed: number
  economicHeadroom: number
  spendablePool: number
  dailyFolego: number | null
  shortfall: number
  limitingFactor: string
  status: string
  budgetConfigured: boolean
  needsIncomeSetup: boolean
}

export type MoneyAccount = {
  id: string
  name: string
  institution?: string | null
  type?: string
  available_for_spending?: boolean
  ownership_type?: string
}

export type MoneyCategory = {
  id: string
  name: string
  parent_id?: string | null
  essential?: boolean
  kind?: string
  path: string
}

export type MoneyTransaction = {
  id: string
  event_type: string
  description: string
  amount: number
  occurred_at: string
  status?: string
  category_id?: string | null
}

export type MoneyBudgetItem = {
  categoryId: string
  categoryPath: string
  plannedAmount: number
  warningThreshold: number
  criticalThreshold: number
}

export type MoneyCard = {
  id: string
  name: string
  issuer?: string | null
  brand?: string | null
  last_four?: string | null
  closing_day?: number
  due_day?: number
  issuer_limit?: number | null
  personal_limit?: number | null
  payment_account_id?: string | null
}

export type MoneyDebt = {
  id: string
  name: string
  creditor?: string | null
  original_amount?: number
  opening_balance?: number
  total_installments?: number
  interest_rate_monthly?: number | null
  status?: string
  debt_type?: string | null
  payment_account_id?: string | null
  started_on?: string | null
  notes?: string | null
  first_due?: string | null
}

export type MoneyRecurring = {
  id: string
  name: string
  item_type: string
  amount: number
  frequency: string
  day_of_month?: number | null
  active?: boolean
  certainty?: string | null
  category_id?: string | null
  account_id?: string | null
  card_id?: string | null
  starts_on?: string | null
  ends_on?: string | null
}

export type MoneyGoal = {
  id: string
  name: string
  target: number
  target_date?: string | null
  icon_key?: string
  status?: string
  contributed: number
}

export type MoneyBundle = {
  session: Session
  space: { id: string; name: string }
  firstName: string
  snapshot: MoneySnapshot
  accounts: MoneyAccount[]
  expenseCategories: MoneyCategory[]
  incomeCategories: MoneyCategory[]
  budgetItems: MoneyBudgetItem[]
  transactions: MoneyTransaction[]
  cards: MoneyCard[]
  debts: MoneyDebt[]
  recurring: MoneyRecurring[]
  goals: MoneyGoal[]
}

function firstMap(value: unknown): Record<string, unknown> {
  if (Array.isArray(value) && value.length) return value[0] as Record<string, unknown>
  if (value && typeof value === 'object') return value as Record<string, unknown>
  throw new Error('Resposta inesperada do módulo financeiro.')
}

function numberValue(value: unknown) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value) || 0
  return 0
}

function parseSnapshot(value: unknown): MoneySnapshot {
  const row = firstMap(value)
  return {
    asOfDate: String(row.as_of_date || new Date().toISOString().slice(0, 10)),
    nextIncomeDate: row.next_income_date ? String(row.next_income_date) : null,
    nextIncomeAmount: numberValue(row.next_income_amount),
    daysUntilIncome: row.days_until_income == null ? null : Number(row.days_until_income),
    liquidBalance: numberValue(row.liquid_balance),
    protectedBalance: numberValue(row.protected_balance),
    mandatoryOutflowsUntilIncome: numberValue(row.mandatory_outflows_until_income),
    cashHeadroom: numberValue(row.cash_headroom),
    monthlyBudgetPlanned: numberValue(row.monthly_budget_planned),
    monthlyBudgetUsed: numberValue(row.monthly_budget_used),
    economicHeadroom: numberValue(row.economic_headroom),
    spendablePool: numberValue(row.spendable_pool),
    dailyFolego: row.daily_folego == null ? null : numberValue(row.daily_folego),
    shortfall: numberValue(row.shortfall),
    limitingFactor: String(row.limiting_factor || 'cash'),
    status: String(row.status || 'atencao'),
    budgetConfigured: Boolean(row.budget_configured),
    needsIncomeSetup: Boolean(row.needs_income_setup),
  }
}

function monthKey(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), '01'].join('-')
}

async function requireSession() {
  const { data, error } = await moneySupabase.auth.getSession()
  if (error) throw error
  if (!data.session) throw new Error('Entre para abrir seu Dinheiro.')
  return data.session
}

async function primarySpace() {
  const { data, error } = await moneySupabase
    .from('financial_spaces')
    .select('id,name')
    .order('created_at')
    .limit(1)
  if (error) throw error
  const row = (data as Array<{ id: string; name: string }> | null)?.[0]
  if (!row) throw new Error('Nenhum espaço financeiro foi encontrado.')
  return row
}

async function profileName(userId: string) {
  const { data, error } = await moneySupabase.from('profiles').select('full_name').eq('id', userId).limit(1)
  if (error) throw error
  const full = (data as Array<{ full_name?: string | null }> | null)?.[0]?.full_name?.trim()
  return full ? full.split(/\s+/)[0] : 'Você'
}

async function categories(spaceId: string, kind: 'expense' | 'income') {
  const { data, error } = await moneySupabase
    .from('categories')
    .select('id,name,parent_id,essential,kind,is_selectable,category_role,sort_order')
    .eq('space_id', spaceId)
    .eq('kind', kind)
    .eq('active', true)
    .eq('category_role', 'economic')
    .order('sort_order')
    .order('name')
  if (error) throw error
  const rows = (data || []) as Array<Record<string, unknown>>
  const nameById = new Map(rows.map((row) => [String(row.id), String(row.name)]))
  return rows
    .filter((row) => row.is_selectable !== false)
    .map((row): MoneyCategory => ({
      id: String(row.id),
      name: String(row.name),
      parent_id: row.parent_id ? String(row.parent_id) : null,
      essential: Boolean(row.essential),
      kind: String(row.kind || kind),
      path: row.parent_id && nameById.get(String(row.parent_id))
        ? nameById.get(String(row.parent_id)) + ' > ' + String(row.name)
        : String(row.name),
    }))
}

async function budgetItems(spaceId: string) {
  const period = monthKey()
  const { data: budgets, error: budgetError } = await moneySupabase
    .from('budgets')
    .select('id')
    .eq('space_id', spaceId)
    .eq('period_month', period)
    .limit(1)
  if (budgetError) throw budgetError
  const budgetId = (budgets as Array<{ id: string }> | null)?.[0]?.id
  if (!budgetId) return [] as MoneyBudgetItem[]

  const [{ data: cats, error: catError }, { data: items, error: itemError }] = await Promise.all([
    moneySupabase.from('categories').select('id,name,parent_id').eq('space_id', spaceId).eq('active', true),
    moneySupabase.from('budget_items')
      .select('category_id,planned_amount,warning_threshold,critical_threshold')
      .eq('space_id', spaceId)
      .eq('budget_id', budgetId),
  ])
  if (catError) throw catError
  if (itemError) throw itemError
  const catRows = (cats || []) as Array<Record<string, unknown>>
  const byId = new Map(catRows.map((row) => [String(row.id), row]))
  const path = (id: string) => {
    const row = byId.get(id)
    if (!row) return 'Categoria'
    const name = String(row.name || 'Categoria')
    const parent = row.parent_id ? byId.get(String(row.parent_id)) : null
    return parent?.name ? String(parent.name) + ' > ' + name : name
  }
  return ((items || []) as Array<Record<string, unknown>>)
    .map((row): MoneyBudgetItem => ({
      categoryId: String(row.category_id),
      categoryPath: path(String(row.category_id)),
      plannedAmount: numberValue(row.planned_amount),
      warningThreshold: numberValue(row.warning_threshold) || .7,
      criticalThreshold: numberValue(row.critical_threshold) || .9,
    }))
    .sort((a, b) => a.categoryPath.localeCompare(b.categoryPath))
}

function publishMoneyBridge(snapshot: MoneySnapshot) {
  const budgetPercent = snapshot.monthlyBudgetPlanned > 0
    ? Math.round((snapshot.monthlyBudgetUsed / snapshot.monthlyBudgetPlanned) * 100)
    : null
  const payload = {
    version: 2,
    schema: 'eu.bridge/2',
    app: 'folego',
    title: 'Dinheiro',
    updatedAt: new Date().toISOString(),
    status: statusForBridge(snapshot.status),
    summary: [
      snapshot.dailyFolego == null ? null : moneyForBridge(snapshot.dailyFolego) + ' por dia',
      budgetPercent == null ? null : budgetPercent + '% do orçamento variável usado',
      snapshot.daysUntilIncome == null ? null : snapshot.daysUntilIncome + ' dias até o próximo recebimento',
      snapshot.shortfall > 0 ? 'atenção ao caixa' : snapshot.cashHeadroom > 0 ? 'caixa com folga' : 'sem déficit projetado',
    ].filter(Boolean).join(' · '),
    metrics: {
      dailyFolego: snapshot.dailyFolego,
      budgetUsedPercent: budgetPercent,
      daysUntilIncome: snapshot.daysUntilIncome,
      shortfall: snapshot.shortfall,
      liquidBalance: snapshot.liquidBalance,
      protectedBalance: snapshot.protectedBalance,
      cashHeadroom: snapshot.cashHeadroom,
      spendablePool: snapshot.spendablePool,
      nextIncomeAmount: snapshot.nextIncomeAmount,
      monthlyBudgetPlanned: snapshot.monthlyBudgetPlanned,
      monthlyBudgetUsed: snapshot.monthlyBudgetUsed,
      budgetConfigured: snapshot.budgetConfigured,
      limitingFactor: snapshot.limitingFactor,
    },
  }
  const encoded = JSON.stringify(payload)
  localStorage.setItem('eu_bridge_folego_v2', encoded)
  localStorage.setItem('eu_bridge_folego_v1', encoded)
  window.dispatchEvent(new Event('eu-bridge-updated'))
}

function moneyForBridge(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(value)
}

function statusForBridge(status: string) {
  if (status === 'tranquilo') return 'dentro do plano'
  if (status === 'segure_gastos') return 'segure gastos'
  if (status === 'sem_folga') return 'sem folga'
  if (status === 'configurar_recebimento') return 'configurar recebimento'
  return status
}

export async function refreshMoneyBridge() {
  const { data } = await moneySupabase.auth.getSession()
  if (!data.session) return false
  const space = await primarySpace()
  const { data: snapshotData, error } = await moneySupabase.rpc('get_folego_snapshot', { p_space_id: space.id })
  if (error) throw error
  publishMoneyBridge(parseSnapshot(snapshotData))
  return true
}

export async function loadMoneyBundle(): Promise<MoneyBundle> {
  const session = await requireSession()
  const space = await primarySpace()
  const [
    firstName,
    snapshotResult,
    accountsResult,
    expenseCategories,
    incomeCategories,
    planned,
    transactionsResult,
    cardsResult,
    debtsResult,
    debtInstallmentsResult,
    recurringResult,
    goalsResult,
    contributionsResult,
  ] = await Promise.all([
    profileName(session.user.id),
    moneySupabase.rpc('get_folego_snapshot', { p_space_id: space.id }),
    moneySupabase.from('accounts').select('id,name,institution,type,available_for_spending,ownership_type').eq('space_id', space.id).eq('active', true).order('name'),
    categories(space.id, 'expense'),
    categories(space.id, 'income'),
    budgetItems(space.id),
    moneySupabase.from('financial_events').select('id,event_type,description,amount,occurred_at,status,category_id').eq('space_id', space.id).order('occurred_at', { ascending: false }).limit(30),
    moneySupabase.from('credit_cards').select('id,name,issuer,brand,last_four,closing_day,due_day,issuer_limit,personal_limit,payment_account_id').eq('space_id', space.id).eq('active', true).order('name'),
    moneySupabase.from('debts').select('id,name,creditor,original_amount,opening_balance,total_installments,interest_rate_monthly,status,debt_type,payment_account_id,started_on,notes').eq('space_id', space.id).is('archived_at', null).order('created_at', { ascending: false }),
    moneySupabase.from('debt_installments').select('debt_id,due_date,installment_number').eq('space_id', space.id).order('installment_number'),
    moneySupabase.from('recurring_items').select('id,name,item_type,amount,frequency,day_of_month,active,certainty,category_id,account_id,card_id,starts_on,ends_on').eq('space_id', space.id).order('name'),
    moneySupabase.from('savings_goals').select('id,name,target,target_date,icon_key,status').eq('space_id', space.id).neq('status', 'archived').order('created_at'),
    moneySupabase.from('goal_contributions').select('goal_id,amount').eq('space_id', space.id),
  ])

  if (snapshotResult.error) throw snapshotResult.error
  for (const result of [accountsResult, transactionsResult, cardsResult, debtsResult, debtInstallmentsResult, recurringResult, goalsResult, contributionsResult]) {
    if (result.error) throw result.error
  }

  const firstDueByDebt = new Map<string, string>()
  for (const row of (debtInstallmentsResult.data || []) as Array<Record<string, unknown>>) {
    const debtId = String(row.debt_id)
    if (!firstDueByDebt.has(debtId) && row.due_date) firstDueByDebt.set(debtId, String(row.due_date))
  }

  const contributed = new Map<string, number>()
  for (const row of (contributionsResult.data || []) as Array<Record<string, unknown>>) {
    const id = String(row.goal_id)
    contributed.set(id, (contributed.get(id) || 0) + numberValue(row.amount))
  }

  const snapshot = parseSnapshot(snapshotResult.data)
  publishMoneyBridge(snapshot)

  return {
    session,
    space,
    firstName,
    snapshot,
    accounts: (accountsResult.data || []) as MoneyAccount[],
    expenseCategories,
    incomeCategories,
    budgetItems: planned,
    transactions: (transactionsResult.data || []).map((row) => ({ ...row, amount: numberValue(row.amount) })) as MoneyTransaction[],
    cards: (cardsResult.data || []).map((row) => ({
      ...row,
      issuer_limit: row.issuer_limit == null ? null : numberValue(row.issuer_limit),
      personal_limit: row.personal_limit == null ? null : numberValue(row.personal_limit),
    })) as MoneyCard[],
    debts: (debtsResult.data || []).map((row) => ({
      ...row,
      original_amount: numberValue(row.original_amount),
      opening_balance: numberValue(row.opening_balance),
      interest_rate_monthly: row.interest_rate_monthly == null ? null : numberValue(row.interest_rate_monthly),
      first_due: firstDueByDebt.get(String(row.id)) || null,
    })) as MoneyDebt[],
    recurring: (recurringResult.data || []).map((row) => ({ ...row, amount: numberValue(row.amount) })) as MoneyRecurring[],
    goals: ((goalsResult.data || []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      target: numberValue(row.target),
      target_date: row.target_date ? String(row.target_date) : null,
      status: row.status ? String(row.status) : undefined,
      contributed: contributed.get(String(row.id)) || 0,
    })),
  }
}

export async function signInMoney(email: string, password: string) {
  const { data, error } = await moneySupabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

export async function signOutMoney() {
  const { error } = await moneySupabase.auth.signOut()
  if (error) throw error
}

export async function registerMoneyMovement(input: {
  type: 'expense' | 'income'
  spaceId: string
  accountId: string
  categoryId: string
  amount: number
  description: string
}) {
  const now = new Date()
  const params = {
    p_space_id: input.spaceId,
    p_account_id: input.accountId,
    p_amount: input.amount,
    p_description: input.description,
    p_category_id: input.categoryId,
    p_occurred_at: now.toISOString(),
    p_competence_date: now.toISOString().slice(0, 10),
    p_source: 'eu',
    p_external_id: null,
  }
  const { data, error } = await moneySupabase.rpc(input.type === 'expense' ? 'register_expense' : 'register_income', params)
  if (error) throw error
  return data
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export async function setMoneyBudgetItem(input: {
  spaceId: string
  categoryId: string
  plannedAmount: number
  warningThreshold?: number
  criticalThreshold?: number
}) {
  const { data, error } = await moneySupabase.rpc('onboarding_set_budget_item', {
    p_space_id: input.spaceId,
    p_period_month: monthKey(),
    p_category_id: input.categoryId,
    p_planned_amount: input.plannedAmount,
    p_warning_threshold: input.warningThreshold ?? .70,
    p_critical_threshold: input.criticalThreshold ?? .90,
  })
  if (error) throw error
  return data
}

export async function createMoneyAccount(input: {
  spaceId: string
  name: string
  openingBalance: number
  institution?: string
  type?: string
  availableForSpending?: boolean
}) {
  const { data, error } = await moneySupabase.rpc('onboarding_create_account', {
    p_space_id: input.spaceId,
    p_name: input.name,
    p_opening_balance: input.openingBalance,
    p_balance_date: todayKey(),
    p_institution: input.institution?.trim() || null,
    p_type: input.type || 'checking',
    p_available_for_spending: input.availableForSpending ?? true,
  })
  if (error) throw error
  return data
}

export async function configureMoneyIncome(input: {
  spaceId: string
  name: string
  amount: number
  dayOfMonth: number
  accountId: string
  categoryId?: string
}) {
  const { data, error } = await moneySupabase.rpc('onboarding_configure_income', {
    p_space_id: input.spaceId,
    p_name: input.name,
    p_amount: input.amount,
    p_day_of_month: input.dayOfMonth,
    p_account_id: input.accountId,
    p_starts_on: todayKey(),
    p_category_id: input.categoryId || null,
  })
  if (error) throw error
  return data
}

export async function configureMoneyRecurringExpense(input: {
  spaceId: string
  name: string
  amount: number
  dayOfMonth: number
  categoryId: string
  accountId: string
  certainty?: string
}) {
  const { data, error } = await moneySupabase.rpc('onboarding_configure_recurring_expense', {
    p_space_id: input.spaceId,
    p_name: input.name,
    p_amount: input.amount,
    p_day_of_month: input.dayOfMonth,
    p_category_id: input.categoryId,
    p_account_id: input.accountId,
    p_starts_on: todayKey(),
    p_certainty: input.certainty || 'confirmed',
  })
  if (error) throw error
  return data
}

export async function createMoneyCard(input: {
  spaceId: string
  name: string
  closingDay: number
  dueDay: number
  paymentAccountId: string
  issuer?: string
  brand?: string
  lastFour?: string
  personalLimit?: number | null
  issuerLimit?: number | null
  currentInvoiceBalance?: number
  currentInvoiceDueDate?: string | null
}) {
  const { data, error } = await moneySupabase.rpc('onboarding_create_card', {
    p_space_id: input.spaceId,
    p_name: input.name,
    p_closing_day: input.closingDay,
    p_due_day: input.dueDay,
    p_payment_account_id: input.paymentAccountId,
    p_issuer: input.issuer?.trim() || null,
    p_brand: input.brand?.trim() || null,
    p_last_four: input.lastFour?.trim() || null,
    p_personal_limit: input.personalLimit ?? null,
    p_issuer_limit: input.issuerLimit ?? null,
    p_current_invoice_balance: input.currentInvoiceBalance ?? 0,
    p_current_invoice_due_date: input.currentInvoiceDueDate || null,
  })
  if (error) throw error
  return data
}


export async function updateMoneyAccount(input: {
  spaceId: string
  accountId: string
  name: string
  institution?: string | null
  type: string
  availableForSpending: boolean
}) {
  const { data, error } = await moneySupabase.rpc('update_wallet_account', {
    p_space_id: input.spaceId,
    p_account_id: input.accountId,
    p_name: input.name,
    p_institution: input.institution?.trim() || null,
    p_type: input.type,
    p_available_for_spending: input.availableForSpending,
  })
  if (error) throw error
  return data
}

export async function archiveMoneyAccount(spaceId: string, accountId: string) {
  const { data, error } = await moneySupabase.rpc('archive_wallet_account', {
    p_space_id: spaceId,
    p_account_id: accountId,
  })
  if (error) throw error
  return data
}

export async function updateMoneyCard(input: {
  spaceId: string
  cardId: string
  name: string
  closingDay: number
  dueDay: number
  paymentAccountId?: string | null
  issuer?: string | null
  brand?: string | null
  lastFour?: string | null
  personalLimit?: number | null
}) {
  const { data, error } = await moneySupabase.rpc('update_wallet_card', {
    p_space_id: input.spaceId,
    p_card_id: input.cardId,
    p_name: input.name,
    p_closing_day: input.closingDay,
    p_due_day: input.dueDay,
    p_payment_account_id: input.paymentAccountId || null,
    p_issuer: input.issuer?.trim() || null,
    p_brand: input.brand?.trim() || null,
    p_last_four: input.lastFour?.trim() || null,
    p_personal_limit: input.personalLimit ?? null,
  })
  if (error) throw error
  return data
}

export async function archiveMoneyCard(spaceId: string, cardId: string) {
  const { data, error } = await moneySupabase.rpc('archive_wallet_card', {
    p_space_id: spaceId,
    p_card_id: cardId,
  })
  if (error) throw error
  return data
}

export async function updateMoneyRecurring(input: {
  spaceId: string
  itemId: string
  name: string
  amount: number
  dayOfMonth: number | null
  categoryId?: string | null
  accountId?: string | null
  cardId?: string | null
  certainty?: string
  active?: boolean
}) {
  const { data, error } = await moneySupabase
    .from('recurring_items')
    .update({
      name: input.name,
      amount: input.amount,
      day_of_month: input.dayOfMonth,
      category_id: input.categoryId || null,
      account_id: input.accountId || null,
      card_id: input.cardId || null,
      certainty: input.certainty || 'confirmed',
      active: input.active ?? true,
    })
    .eq('space_id', input.spaceId)
    .eq('id', input.itemId)
    .select('id')
    .single()
  if (error) throw error
  return data
}

export async function setMoneyRecurringActive(spaceId: string, itemId: string, active: boolean) {
  const { data, error } = await moneySupabase
    .from('recurring_items')
    .update({ active })
    .eq('space_id', spaceId)
    .eq('id', itemId)
    .select('id')
    .single()
  if (error) throw error
  return data
}

export async function createMoneyGoal(input: {
  spaceId: string
  name: string
  target: number
  targetDate?: string | null
  iconKey?: string
}) {
  const { data, error } = await moneySupabase
    .from('savings_goals')
    .insert({
      space_id: input.spaceId,
      name: input.name,
      target: input.target,
      target_date: input.targetDate || null,
      icon_key: input.iconKey || 'piggy-bank',
      status: 'active',
    })
    .select('id')
    .single()
  if (error) throw error
  return data
}

export async function updateMoneyGoal(input: {
  spaceId: string
  goalId: string
  name: string
  target: number
  targetDate?: string | null
  iconKey?: string
  status?: string
}) {
  const { data, error } = await moneySupabase
    .from('savings_goals')
    .update({
      name: input.name,
      target: input.target,
      target_date: input.targetDate || null,
      icon_key: input.iconKey || 'piggy-bank',
      status: input.status || 'active',
      completed_at: input.status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('space_id', input.spaceId)
    .eq('id', input.goalId)
    .select('id')
    .single()
  if (error) throw error
  return data
}

export async function addMoneyGoalContribution(input: {
  spaceId: string
  goalId: string
  amount: number
  note?: string | null
}) {
  const { data, error } = await moneySupabase
    .from('goal_contributions')
    .insert({
      space_id: input.spaceId,
      goal_id: input.goalId,
      amount: input.amount,
      note: input.note?.trim() || null,
    })
    .select('id')
    .single()
  if (error) throw error
  return data
}

export async function createMoneyDebt(input: {
  spaceId: string
  name: string
  creditor: string
  originalAmount: number
  totalInstallments?: number | null
  firstDue: string
  paymentAccountId?: string | null
  startedOn?: string | null
  interestRateMonthly?: number | null
  debtType?: string
  notes?: string | null
}) {
  const { data, error } = await moneySupabase.rpc('create_debt_v2', {
    p_space_id: input.spaceId,
    p_name: input.name,
    p_creditor: input.creditor,
    p_original_amount: input.originalAmount,
    p_total_installments: input.totalInstallments ?? null,
    p_first_due: input.firstDue,
    p_payment_account_id: input.paymentAccountId || null,
    p_started_on: input.startedOn || todayKey(),
    p_interest_rate_monthly: input.interestRateMonthly ?? null,
    p_debt_type: input.debtType || 'other',
    p_notes: input.notes?.trim() || null,
  })
  if (error) throw error
  return data
}

export async function updateMoneyDebt(input: {
  spaceId: string
  debtId: string
  name: string
  creditor: string
  originalAmount: number
  totalInstallments?: number | null
  firstDue: string
  paymentAccountId?: string | null
  startedOn?: string | null
  interestRateMonthly?: number | null
  debtType?: string
  notes?: string | null
}) {
  const { data, error } = await moneySupabase.rpc('update_debt_v2', {
    p_space_id: input.spaceId,
    p_debt_id: input.debtId,
    p_name: input.name,
    p_creditor: input.creditor,
    p_original_amount: input.originalAmount,
    p_total_installments: input.totalInstallments ?? null,
    p_first_due: input.firstDue,
    p_payment_account_id: input.paymentAccountId || null,
    p_started_on: input.startedOn || todayKey(),
    p_interest_rate_monthly: input.interestRateMonthly ?? null,
    p_debt_type: input.debtType || 'other',
    p_notes: input.notes?.trim() || null,
  })
  if (error) throw error
  return data
}

export async function archiveMoneyDebt(spaceId: string, debtId: string) {
  const { data, error } = await moneySupabase.rpc('archive_debt', {
    p_space_id: spaceId,
    p_debt_id: debtId,
  })
  if (error) throw error
  return data
}

export async function closeMoneyDebt(spaceId: string, debtId: string) {
  const { data, error } = await moneySupabase.rpc('close_debt', {
    p_space_id: spaceId,
    p_debt_id: debtId,
  })
  if (error) throw error
  return data
}
