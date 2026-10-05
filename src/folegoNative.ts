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
}

export type MoneyGoal = {
  id: string
  name: string
  target: number
  target_date?: string | null
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
    moneySupabase.from('credit_cards').select('id,name,issuer,brand,last_four,closing_day,due_day,issuer_limit,personal_limit').eq('space_id', space.id).eq('active', true).order('name'),
    moneySupabase.from('debts').select('id,name,creditor,original_amount,opening_balance,total_installments,interest_rate_monthly,status,debt_type').eq('space_id', space.id).is('archived_at', null).order('created_at', { ascending: false }),
    moneySupabase.from('recurring_items').select('id,name,item_type,amount,frequency,day_of_month,active,certainty').eq('space_id', space.id).eq('active', true).order('name'),
    moneySupabase.from('savings_goals').select('id,name,target,target_date,status').eq('space_id', space.id).neq('status', 'archived').order('created_at'),
    moneySupabase.from('goal_contributions').select('goal_id,amount').eq('space_id', space.id),
  ])

  if (snapshotResult.error) throw snapshotResult.error
  for (const result of [accountsResult, transactionsResult, cardsResult, debtsResult, recurringResult, goalsResult, contributionsResult]) {
    if (result.error) throw result.error
  }

  const contributed = new Map<string, number>()
  for (const row of (contributionsResult.data || []) as Array<Record<string, unknown>>) {
    const id = String(row.goal_id)
    contributed.set(id, (contributed.get(id) || 0) + numberValue(row.amount))
  }

  return {
    session,
    space,
    firstName,
    snapshot: parseSnapshot(snapshotResult.data),
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
