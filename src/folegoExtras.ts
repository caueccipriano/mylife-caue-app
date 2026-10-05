import { moneySupabase, type MoneyCategory } from './folegoNative'

export type ProjectionMonth = {
  month: string
  opening_balance: number
  income: number
  direct_expenses: number
  recurring_expenses: number
  card_installments: number
  debts: number
  reserve_transfers: number
  investments: number
  net_change: number
  closing_balance: number
  closing_projected: number
}

export type ProjectionResult = {
  scenario: string
  horizon_months: number
  as_of_date: string
  opening_balance: number
  has_projection_inputs: boolean
  summary: {
    ending_balance: number
    minimum_balance: number
    maximum_balance: number
    projected_savings: number
    critical_month?: string | null
  }
  months: ProjectionMonth[]
}

export type MoneyUpcoming = {
  event_key: string
  source: string
  source_id?: string | null
  title: string
  subtitle?: string | null
  due_date: string
  amount: number
  direction: string
  status: string
  overdue: boolean
  realized: boolean
  recurring: boolean
  installment_number?: number | null
  installment_count?: number | null
  navigation_target?: string | null
  cash_obligation?: boolean
}

export type DiaryReflectionType = 'necessary' | 'want' | 'self_investment'

export type DiaryEntry = {
  eventId: string
  eventType: string
  description: string
  amount: number
  occurredAt: string
  categoryName?: string | null
  reflection?: {
    id: string
    type: DiaryReflectionType
    note?: string | null
  } | null
}

export type AutomationRule = {
  id: string
  name: string
  active: boolean
  match_field?: string | null
  match_type?: string | null
  match_value?: string | null
  action_type?: string | null
  execution_mode?: string | null
  priority?: number | null
  category_id?: string | null
  classification_value?: string | null
}

export type ManagedCategory = {
  id: string
  name: string
  kind: 'expense' | 'income'
  parent_id?: string | null
  essential: boolean
  active: boolean
  is_system: boolean
  is_selectable: boolean
  category_role: string
  color_hex?: string | null
  icon_key?: string | null
  path: string
}

export type NotificationPreferences = {
  financial_reminders_enabled: boolean
  invoices_enabled: boolean
  debts_enabled: boolean
  recurrences_enabled: boolean
  subscriptions_enabled: boolean
  expected_income_enabled: boolean
  overdue_enabled: boolean
  plan_thresholds_enabled: boolean
  card_limit_thresholds_enabled: boolean
  large_expenses_enabled: boolean
  large_expense_threshold: number
  daily_summary_enabled: boolean
  daily_summary_time: string
  quiet_hours_enabled: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  reminder_offset_days: number
  preferred_time: string
}

export type NotificationHistoryItem = {
  id: string | number
  kind: string
  title: string
  body: string
  route?: string | null
  delivered_at: string
}

export type MoneySubscription = {
  id: string
  name: string
  amount: number
  frequency: string
  card_id?: string | null
  day_of_month?: number | null
  certainty?: string | null
}

export type ImportBatch = {
  id: string
  filename: string
  file_type: string
  source_kind: string
  status: string
  total_rows: number
  selected_rows?: number
  imported_rows: number
  ignored_rows: number
  duplicate_rows: number
  error_rows: number
  created_at: string
}

export type ImportRow = {
  id: string
  row_number: number
  occurred_at: string
  description: string
  merchant?: string | null
  amount: number
  direction: 'debit' | 'credit'
  candidate_type?: string | null
  final_type?: string | null
  category_id?: string | null
  duplicate_state?: string | null
  user_decision?: 'include' | 'ignore' | 'review' | null
  status?: string | null
  reason?: string | null
  error_text?: string | null
  automation_recognized?: boolean
  automation_suggested_category_id?: string | null
  automation_suggested_final_type?: string | null
}

export type MoneyExtras = {
  projection: ProjectionResult | null
  upcoming: MoneyUpcoming[]
  diary: DiaryEntry[]
  subscriptions: MoneySubscription[]
  categories: ManagedCategory[]
  automations: AutomationRule[]
  notificationPreferences: NotificationPreferences
  notificationHistory: NotificationHistoryItem[]
  importBatches: ImportBatch[]
}

function n(value: unknown) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value) || 0
  return 0
}

function dateOnly(value: Date) {
  const y = value.getFullYear()
  const m = String(value.getMonth() + 1).padStart(2, '0')
  const d = String(value.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function defaultPreferences(): NotificationPreferences {
  return {
    financial_reminders_enabled: true,
    invoices_enabled: true,
    debts_enabled: true,
    recurrences_enabled: true,
    subscriptions_enabled: true,
    expected_income_enabled: true,
    overdue_enabled: true,
    plan_thresholds_enabled: true,
    card_limit_thresholds_enabled: true,
    large_expenses_enabled: false,
    large_expense_threshold: 500,
    daily_summary_enabled: false,
    daily_summary_time: '08:00',
    quiet_hours_enabled: true,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
    reminder_offset_days: 2,
    preferred_time: '09:00',
  }
}

async function loadDiary(spaceId: string): Promise<DiaryEntry[]> {
  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
  const { data: events, error } = await moneySupabase
    .from('financial_events')
    .select('id,event_type,description,amount,occurred_at,category:categories(name,parent_id)')
    .eq('space_id', spaceId)
    .eq('status', 'confirmed')
    .in('event_type', ['expense', 'card_purchase', 'benefit_expense'])
    .gte('occurred_at', start.toISOString())
    .lt('occurred_at', end.toISOString())
    .order('occurred_at', { ascending: false })
    .limit(80)
  if (error) throw error
  const ids = (events || []).map((row) => String(row.id))
  const reflectionMap = new Map<string, { id: string; type: DiaryReflectionType; note?: string | null }>()
  if (ids.length) {
    const { data: reflections, error: reflectionError } = await moneySupabase
      .from('transaction_reflections')
      .select('id,event_id,reflection_type,note')
      .eq('space_id', spaceId)
      .in('event_id', ids)
    if (reflectionError) throw reflectionError
    for (const row of reflections || []) {
      reflectionMap.set(String(row.event_id), {
        id: String(row.id),
        type: String(row.reflection_type) as DiaryReflectionType,
        note: row.note ? String(row.note) : null,
      })
    }
  }
  return (events || []).map((row) => {
    const cat = Array.isArray(row.category) ? row.category[0] : row.category
    return {
      eventId: String(row.id),
      eventType: String(row.event_type),
      description: String(row.description || 'Gasto'),
      amount: n(row.amount),
      occurredAt: String(row.occurred_at),
      categoryName: cat && typeof cat === 'object' && 'name' in cat ? String(cat.name) : null,
      reflection: reflectionMap.get(String(row.id)) || null,
    }
  })
}

async function loadCategories(spaceId: string): Promise<ManagedCategory[]> {
  const { data, error } = await moneySupabase
    .from('categories')
    .select('id,name,kind,parent_id,essential,active,is_system,is_selectable,category_role,color_hex,icon_key,sort_order')
    .eq('space_id', spaceId)
    .eq('category_role', 'economic')
    .order('kind')
    .order('sort_order')
    .order('name')
  if (error) throw error
  const rows = data || []
  const names = new Map(rows.map((row) => [String(row.id), String(row.name)]))
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    kind: String(row.kind) as 'expense' | 'income',
    parent_id: row.parent_id ? String(row.parent_id) : null,
    essential: Boolean(row.essential),
    active: Boolean(row.active),
    is_system: Boolean(row.is_system),
    is_selectable: row.is_selectable !== false,
    category_role: String(row.category_role || 'economic'),
    color_hex: row.color_hex ? String(row.color_hex) : null,
    icon_key: row.icon_key ? String(row.icon_key) : null,
    path: row.parent_id && names.get(String(row.parent_id))
      ? names.get(String(row.parent_id)) + ' > ' + String(row.name)
      : String(row.name),
  }))
}

async function loadPreferences(spaceId: string, userId: string) {
  const { data, error } = await moneySupabase
    .from('notification_preferences')
    .select('*')
    .eq('space_id', spaceId)
    .eq('user_id', userId)
    .limit(1)
  if (error) throw error
  const row = (data || [])[0]
  if (!row) return defaultPreferences()
  const base = defaultPreferences()
  const result = { ...base } as Record<string, unknown>
  for (const key of Object.keys(base)) {
    if (row[key] != null) result[key] = row[key]
  }
  result.large_expense_threshold = n(result.large_expense_threshold)
  result.reminder_offset_days = Number(result.reminder_offset_days) || 2
  return result as NotificationPreferences
}

export async function loadMoneyExtras(spaceId: string, userId: string, horizonMonths = 12): Promise<MoneyExtras> {
  const today = new Date()
  const until = new Date(today)
  until.setDate(today.getDate() + 60)

  const [
    projectionResult,
    upcomingResult,
    diary,
    subscriptionsResult,
    categories,
    automationsResult,
    preferences,
    historyResult,
    batchesResult,
  ] = await Promise.all([
    moneySupabase.rpc('get_projection', {
      p_space_id: spaceId,
      p_horizon_months: horizonMonths,
      p_adjustments: [],
      p_disabled_variable_income_keys: [],
    }),
    moneySupabase.rpc('get_upcoming_events', {
      p_space_id: spaceId,
      p_start_date: dateOnly(today),
      p_end_date: dateOnly(until),
      p_limit: 120,
    }),
    loadDiary(spaceId),
    moneySupabase
      .from('recurring_items')
      .select('id,name,amount,frequency,card_id,day_of_month,certainty')
      .eq('space_id', spaceId)
      .eq('active', true)
      .eq('recurrence_kind', 'subscription')
      .order('name'),
    loadCategories(spaceId),
    moneySupabase
      .from('automation_rules')
      .select('id,name,active,match_field,match_type,match_value,action_type,execution_mode,priority,category_id,classification_value')
      .eq('space_id', spaceId)
      .order('priority', { ascending: false })
      .order('created_at'),
    loadPreferences(spaceId, userId),
    moneySupabase
      .from('notification_history')
      .select('id,kind,title,body,route,delivered_at')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .order('delivered_at', { ascending: false })
      .limit(25),
    moneySupabase
      .from('import_batches')
      .select('id,filename,file_type,source_kind,status,total_rows,selected_rows,imported_rows,ignored_rows,duplicate_rows,error_rows,created_at')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (projectionResult.error) throw projectionResult.error
  if (upcomingResult.error) throw upcomingResult.error
  if (subscriptionsResult.error) throw subscriptionsResult.error
  if (automationsResult.error) throw automationsResult.error
  if (historyResult.error) throw historyResult.error
  if (batchesResult.error) throw batchesResult.error

  const rawProjection = projectionResult.data as Record<string, unknown> | null
  const projection = rawProjection
    ? {
        ...(rawProjection as unknown as ProjectionResult),
        opening_balance: n(rawProjection.opening_balance),
        summary: {
          ...((rawProjection.summary || {}) as ProjectionResult['summary']),
          ending_balance: n((rawProjection.summary as Record<string, unknown> | undefined)?.ending_balance),
          minimum_balance: n((rawProjection.summary as Record<string, unknown> | undefined)?.minimum_balance),
          maximum_balance: n((rawProjection.summary as Record<string, unknown> | undefined)?.maximum_balance),
          projected_savings: n((rawProjection.summary as Record<string, unknown> | undefined)?.projected_savings),
        },
        months: Array.isArray(rawProjection.months)
          ? (rawProjection.months as Array<Record<string, unknown>>).map((row) => ({
              month: String(row.month),
              opening_balance: n(row.opening_balance),
              income: n(row.income),
              direct_expenses: n(row.direct_expenses),
              recurring_expenses: n(row.recurring_expenses),
              card_installments: n(row.card_installments),
              debts: n(row.debts),
              reserve_transfers: n(row.reserve_transfers),
              investments: n(row.investments),
              net_change: n(row.net_change),
              closing_balance: n(row.closing_balance),
              closing_projected: n(row.closing_projected),
            }))
          : [],
      }
    : null

  return {
    projection,
    upcoming: ((upcomingResult.data || []) as Array<Record<string, unknown>>).map((row) => ({
      event_key: String(row.event_key || row.id || crypto.randomUUID()),
      source: String(row.source || 'finance'),
      source_id: row.source_id ? String(row.source_id) : null,
      title: String(row.title || row.name || 'Evento'),
      subtitle: row.subtitle ? String(row.subtitle) : null,
      due_date: String(row.due_date),
      amount: n(row.amount),
      direction: String(row.direction || 'outflow'),
      status: String(row.status || 'pending'),
      overdue: Boolean(row.overdue),
      realized: Boolean(row.realized),
      recurring: Boolean(row.recurring),
      installment_number: row.installment_number == null ? null : Number(row.installment_number),
      installment_count: row.installment_count == null ? null : Number(row.installment_count),
      navigation_target: row.navigation_target ? String(row.navigation_target) : null,
      cash_obligation: Boolean(row.cash_obligation),
    })),
    diary,
    subscriptions: ((subscriptionsResult.data || []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      amount: n(row.amount),
      frequency: String(row.frequency),
      card_id: row.card_id ? String(row.card_id) : null,
      day_of_month: row.day_of_month == null ? null : Number(row.day_of_month),
      certainty: row.certainty ? String(row.certainty) : null,
    })),
    categories,
    automations: (automationsResult.data || []) as AutomationRule[],
    notificationPreferences: preferences,
    notificationHistory: (historyResult.data || []) as NotificationHistoryItem[],
    importBatches: ((batchesResult.data || []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      filename: String(row.filename),
      file_type: String(row.file_type),
      source_kind: String(row.source_kind),
      status: String(row.status),
      total_rows: Number(row.total_rows) || 0,
      selected_rows: row.selected_rows == null ? undefined : Number(row.selected_rows),
      imported_rows: Number(row.imported_rows) || 0,
      ignored_rows: Number(row.ignored_rows) || 0,
      duplicate_rows: Number(row.duplicate_rows) || 0,
      error_rows: Number(row.error_rows) || 0,
      created_at: String(row.created_at),
    })),
  }
}

export async function addGoalContribution(spaceId: string, goalId: string, amount: number, note?: string) {
  const { error } = await moneySupabase.from('goal_contributions').insert({
    space_id: spaceId,
    goal_id: goalId,
    amount,
    contributed_at: new Date().toISOString(),
    note: note?.trim() || null,
  })
  if (error) throw error
}

export async function createMoneyGoal(spaceId: string, name: string, target: number, targetDate?: string) {
  const { error } = await moneySupabase.from('savings_goals').insert({
    space_id: spaceId,
    name: name.trim(),
    target,
    target_date: targetDate || null,
    icon_key: 'sparkles',
    status: 'active',
  })
  if (error) throw error
}

export async function archiveMoneyGoal(spaceId: string, goalId: string) {
  const { error } = await moneySupabase.from('savings_goals').update({ status: 'archived' }).eq('space_id', spaceId).eq('id', goalId)
  if (error) throw error
}

export async function upsertDiaryReflection(spaceId: string, eventId: string, type: DiaryReflectionType, note?: string) {
  const { error } = await moneySupabase.from('transaction_reflections').upsert({
    space_id: spaceId,
    event_id: eventId,
    reflection_type: type,
    note: note?.trim() || null,
  }, { onConflict: 'space_id,event_id' })
  if (error) throw error
}

export async function removeDiaryReflection(spaceId: string, eventId: string) {
  const { error } = await moneySupabase.from('transaction_reflections').delete().eq('space_id', spaceId).eq('event_id', eventId)
  if (error) throw error
}

export async function toggleSubscription(spaceId: string, recurringId: string, enabled: boolean) {
  const { error } = await moneySupabase.from('recurring_items').update({
    recurrence_kind: enabled ? 'subscription' : null,
    updated_at: new Date().toISOString(),
  }).eq('space_id', spaceId).eq('id', recurringId)
  if (error) throw error
}

export async function toggleAutomation(spaceId: string, ruleId: string, active: boolean) {
  const { error } = await moneySupabase.from('automation_rules').update({ active }).eq('space_id', spaceId).eq('id', ruleId)
  if (error) throw error
}

export async function setCategoryVisibility(spaceId: string, categoryId: string, active: boolean) {
  const { error } = await moneySupabase.rpc('set_category_visibility', {
    p_space_id: spaceId,
    p_category_id: categoryId,
    p_active: active,
  })
  if (error) throw error
}

export async function createCustomCategory(input: {
  spaceId: string
  name: string
  kind: 'expense' | 'income'
  parentId?: string | null
  essential?: boolean
}) {
  const { error } = await moneySupabase.rpc('create_custom_category', {
    p_space_id: input.spaceId,
    p_name: input.name.trim(),
    p_kind: input.kind,
    p_parent_id: input.parentId || null,
    p_essential: Boolean(input.essential),
    p_color_hex: '#8C8CA8',
    p_search_aliases: [],
  })
  if (error) throw error
}

export async function saveNotificationPreferences(spaceId: string, userId: string, preferences: NotificationPreferences) {
  const { error } = await moneySupabase.from('notification_preferences').upsert({
    user_id: userId,
    space_id: spaceId,
    ...preferences,
  }, { onConflict: 'user_id,space_id' })
  if (error) throw error
}

export async function loadProjection(spaceId: string, horizonMonths: number): Promise<ProjectionResult | null> {
  const { data, error } = await moneySupabase.rpc('get_projection', {
    p_space_id: spaceId,
    p_horizon_months: horizonMonths,
    p_adjustments: [],
    p_disabled_variable_income_keys: [],
  })
  if (error) throw error
  return data as ProjectionResult | null
}

export type StatementSourceKind = 'account' | 'card' | 'benefit'
export type StatementFileType = 'csv' | 'ofx'

export type CsvMapping = {
  date: number
  description: number
  amount: number
  merchant: number
  externalId: number
}

export type ParsedStatement = {
  fileType: StatementFileType
  fingerprint: string
  headers: string[]
  rows: string[][]
  delimiter?: string
  suggested: CsvMapping
  candidates?: StatementCandidate[]
}

export type StatementCandidate = {
  row_number: number
  occurred_at: string
  date_only: boolean
  local_date: string | null
  amount: string
  description: string
  merchant: string | null
  direction: 'debit' | 'credit'
  external_id: string | null
  candidate_type: string
  final_type: string | null
  category_id: string | null
  confidence: number
  reason: string
  original_fields: Record<string, unknown>
}

async function fingerprint(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function parseCsvRows(text: string, delimiter: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"'
        i++
      } else quoted = !quoted
      continue
    }
    if (!quoted && c === delimiter) {
      row.push(cell)
      cell = ''
      continue
    }
    if (!quoted && (c === '\n' || c === '\r')) {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      cell = ''
      rows.push(row)
      row = []
      continue
    }
    cell += c
  }
  if (quoted) throw new Error('O CSV tem aspas abertas e não pôde ser lido.')
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

function delimiterFor(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim()).slice(0, 8)
  let best = ','
  let score = -1
  for (const delimiter of [',', ';', '\t']) {
    const widths = lines.map((line) => parseCsvRows(line, delimiter)[0]?.length || 1)
    const counts = new Map<number, number>()
    widths.forEach((w) => counts.set(w, (counts.get(w) || 0) + 1))
    const entry = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
    const next = entry && entry[0] > 1 ? entry[1] * 100 + entry[0] : 0
    if (next > score) {
      score = next
      best = delimiter
    }
  }
  return best
}

function normalizeHeader(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function suggest(headers: string[], patterns: RegExp[]) {
  const idx = headers.findIndex((header) => patterns.some((pattern) => pattern.test(normalizeHeader(header))))
  return idx
}

function parseMoney(raw: string) {
  let value = raw.trim().replace(/[^0-9,\.\-+()]/g, '')
  const negative = value.startsWith('-') || (value.startsWith('(') && value.endsWith(')'))
  value = value.replace(/[+\-()]/g, '')
  if (!value) throw new Error('valor inválido')
  const comma = value.lastIndexOf(',')
  const dot = value.lastIndexOf('.')
  let normalized: string
  if (comma >= 0 && (dot < 0 || comma > dot)) normalized = value.replace(/\./g, '').replace(',', '.')
  else normalized = value.replace(/,/g, '')
  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount === 0) throw new Error('valor inválido')
  return negative ? -amount : amount
}

function parseStatementDate(raw: string) {
  const value = raw.trim()
  const iso = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12)
    return { iso: d.toISOString(), local: dateOnly(d) }
  }
  const br = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/)
  if (br) {
    const year = br[3].length === 2 ? 2000 + Number(br[3]) : Number(br[3])
    const d = new Date(year, Number(br[2]) - 1, Number(br[1]), 12)
    return { iso: d.toISOString(), local: dateOnly(d) }
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) throw new Error('data inválida')
  return { iso: parsed.toISOString(), local: dateOnly(parsed) }
}

function classify(sourceKind: StatementSourceKind, direction: 'debit' | 'credit') {
  if (sourceKind === 'card') {
    return direction === 'debit'
      ? { candidate: 'card_purchase', final: 'card_purchase', reason: 'débito em fatura/cartão' }
      : { candidate: 'refund_candidate', final: null, reason: 'crédito em cartão pede revisão' }
  }
  if (sourceKind === 'benefit') {
    return direction === 'debit'
      ? { candidate: 'benefit_expense', final: 'benefit_expense', reason: 'saída em benefício' }
      : { candidate: 'benefit_credit', final: 'benefit_credit', reason: 'entrada em benefício' }
  }
  return direction === 'debit'
    ? { candidate: 'expense', final: 'expense', reason: 'saída em conta' }
    : { candidate: 'income', final: 'income', reason: 'entrada em conta' }
}

export async function parseStatementFile(file: File, sourceKind: StatementSourceKind): Promise<ParsedStatement> {
  if (file.size > 4 * 1024 * 1024) throw new Error('O arquivo ultrapassa o limite de 4 MB.')
  const buffer = await file.arrayBuffer()
  const hash = await fingerprint(buffer)
  const text = new TextDecoder('utf-8').decode(buffer).replace(/^\uFEFF/, '')
  const lowerName = file.name.toLowerCase()
  const fileType: StatementFileType = lowerName.endsWith('.ofx') ? 'ofx' : 'csv'

  if (fileType === 'ofx') {
    const blocks = text.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|<\/CCSTMTRS>|$)/gi) || []
    const candidates: StatementCandidate[] = blocks.slice(0, 2000).map((block, index) => {
      const tag = (name: string) => block.match(new RegExp('<' + name + '>([^<\\r\\n]+)', 'i'))?.[1]?.trim() || null
      const amount = Number((tag('TRNAMT') || '0').replace(',', '.'))
      const posted = tag('DTPOSTED') || tag('DTUSER')
      if (!posted || !amount) throw new Error('Há lançamento OFX sem data ou valor.')
      const rawDate = posted.slice(0, 8)
      const d = new Date(Number(rawDate.slice(0, 4)), Number(rawDate.slice(4, 6)) - 1, Number(rawDate.slice(6, 8)), 12)
      const direction: 'debit' | 'credit' = amount < 0 ? 'debit' : 'credit'
      const c = classify(sourceKind, direction)
      const name = tag('NAME')
      const memo = tag('MEMO')
      const description = [...new Set([name, memo].filter(Boolean))].join(' — ') || 'Lançamento OFX'
      return {
        row_number: index + 1,
        occurred_at: d.toISOString(),
        date_only: true,
        local_date: dateOnly(d),
        amount: Math.abs(amount).toFixed(2),
        description,
        merchant: name,
        direction,
        external_id: tag('FITID'),
        candidate_type: c.candidate,
        final_type: c.final,
        category_id: null,
        confidence: c.final ? .94 : .55,
        reason: c.reason,
        original_fields: { statement_type: tag('TRNTYPE') },
      }
    })
    if (!candidates.length) throw new Error('O OFX não contém lançamentos reconhecíveis.')
    return { fileType, fingerprint: hash, headers: [], rows: [], suggested: { date: -1, description: -1, amount: -1, merchant: -1, externalId: -1 }, candidates }
  }

  const delimiter = delimiterFor(text)
  const raw = parseCsvRows(text, delimiter).filter((row) => row.some((cell) => cell.trim()))
  if (!raw.length) throw new Error('O CSV está vazio.')
  if (raw.length > 2001) throw new Error('O arquivo ultrapassa o limite de 2.000 linhas.')
  const first = raw[0].map((value) => normalizeHeader(value))
  const looksHeader = first.some((value) => /data|date|valor|amount|descr|histor|memo|merchant|estabele/.test(value))
  const width = Math.max(...raw.map((row) => row.length))
  const headers = looksHeader
    ? Array.from({ length: width }, (_, i) => raw[0][i]?.trim() || 'coluna ' + (i + 1))
    : Array.from({ length: width }, (_, i) => 'coluna ' + (i + 1))
  const rows = (looksHeader ? raw.slice(1) : raw).map((row) => Array.from({ length: width }, (_, i) => row[i] || ''))
  const suggested: CsvMapping = {
    date: suggest(headers, [/^data$/, /date/, /dt.*(mov|lan|post)/]),
    description: suggest(headers, [/descri/, /histor/, /description/, /memo/, /^name$/]),
    amount: suggest(headers, [/^valor$/, /amount/, /trnamt/]),
    merchant: suggest(headers, [/estabele/, /merchant/, /favorec/]),
    externalId: suggest(headers, [/fitid/, /id.*extern/, /transaction.*id/, /^id$/]),
  }
  return { fileType, fingerprint: hash, headers, rows, delimiter, suggested }
}

export function buildStatementCandidates(parsed: ParsedStatement, mapping: CsvMapping, sourceKind: StatementSourceKind) {
  if (parsed.candidates) return parsed.candidates
  if (mapping.date < 0 || mapping.description < 0 || mapping.amount < 0) throw new Error('Mapeie data, descrição e valor antes de continuar.')
  return parsed.rows.slice(0, 2000).map((row, index): StatementCandidate => {
    const rawAmount = parseMoney(row[mapping.amount] || '')
    const direction: 'debit' | 'credit' = rawAmount < 0 ? 'debit' : 'credit'
    const c = classify(sourceKind, direction)
    const date = parseStatementDate(row[mapping.date] || '')
    const description = (row[mapping.description] || '').trim()
    if (!description) throw new Error('Há linha sem descrição.')
    return {
      row_number: index + 1,
      occurred_at: date.iso,
      date_only: true,
      local_date: date.local,
      amount: Math.abs(rawAmount).toFixed(2),
      description,
      merchant: mapping.merchant >= 0 ? (row[mapping.merchant] || '').trim() || null : null,
      direction,
      external_id: mapping.externalId >= 0 ? (row[mapping.externalId] || '').trim() || null : null,
      candidate_type: c.candidate,
      final_type: c.final,
      category_id: null,
      confidence: c.final ? .92 : .5,
      reason: c.reason,
      original_fields: {},
    }
  })
}

export async function stageStatementImport(input: {
  spaceId: string
  file: File
  sourceKind: StatementSourceKind
  sourceAccountId?: string | null
  sourceCardId?: string | null
  parsed: ParsedStatement
  mapping: CsvMapping
}) {
  const candidates = buildStatementCandidates(input.parsed, input.mapping, input.sourceKind)
  const { data, error } = await moneySupabase.rpc('stage_transaction_import', {
    p_space_id: input.spaceId,
    p_filename: input.file.name,
    p_file_type: input.parsed.fileType,
    p_source_kind: input.sourceKind,
    p_source_account_id: input.sourceAccountId || null,
    p_source_card_id: input.sourceCardId || null,
    p_source_institution: null,
    p_file_fingerprint: input.parsed.fingerprint,
    p_configuration: input.parsed.fileType === 'csv' ? { mapping: input.mapping, delimiter: input.parsed.delimiter } : {},
    p_parser_version: 'eu-1.0',
    p_rows: candidates,
  })
  if (error) throw error
  const batchId = String(data)
  const auto = await moneySupabase.rpc('apply_automation_rules_to_import_batch', { p_space_id: input.spaceId, p_batch_id: batchId })
  if (auto.error) throw auto.error
  return batchId
}

export async function loadImportRows(spaceId: string, batchId: string): Promise<ImportRow[]> {
  const { data, error } = await moneySupabase
    .from('import_rows')
    .select('id,row_number,occurred_at,description,merchant,amount,direction,candidate_type,final_type,category_id,duplicate_state,user_decision,status,reason,error_text,automation_recognized,automation_suggested_category_id,automation_suggested_final_type')
    .eq('space_id', spaceId)
    .eq('batch_id', batchId)
    .order('row_number')
  if (error) throw error
  return (data || []).map((row) => ({ ...row, amount: n(row.amount) })) as ImportRow[]
}

export async function updateImportRows(spaceId: string, batchId: string, rows: ImportRow[]) {
  const updates = rows.map((row) => ({
    id: row.id,
    user_decision: row.user_decision || 'review',
    final_type: row.final_type || null,
    category_id: row.category_id || null,
    counterpart_account_id: null,
    invoice_id: null,
  }))
  const { error } = await moneySupabase.rpc('update_import_rows_review', {
    p_space_id: spaceId,
    p_batch_id: batchId,
    p_updates: updates,
  })
  if (error) throw error
}

export async function confirmImport(spaceId: string, batchId: string) {
  const { data, error } = await moneySupabase.rpc('confirm_transaction_import', {
    p_space_id: spaceId,
    p_batch_id: batchId,
  })
  if (error) throw error
  return data
}

export async function cancelImport(spaceId: string, batchId: string) {
  const { error } = await moneySupabase.rpc('cancel_transaction_import', {
    p_space_id: spaceId,
    p_batch_id: batchId,
  })
  if (error) throw error
}

export async function createAutomationRule(input: {
  spaceId: string
  userId: string
  name: string
  matchValue: string
  categoryId?: string | null
  classificationValue?: string | null
}) {
  const { error } = await moneySupabase.from('automation_rules').insert({
    space_id: input.spaceId,
    name: input.name.trim(),
    active: true,
    trigger_type: 'import',
    match_field: 'description',
    match_type: 'contains',
    match_value: input.matchValue.trim(),
    source_scope_type: 'all',
    direction: 'any',
    category_id: input.categoryId || null,
    classification_value: input.classificationValue || null,
    action_type: input.categoryId ? 'set_category' : 'classify',
    execution_mode: 'suggest',
    priority: 0,
    created_by: input.userId,
  })
  if (error) throw error
}

export async function createWalletAccount(input: {
  spaceId: string
  name: string
  type: string
  openingBalance: number
  institution?: string
  availableForSpending: boolean
}) {
  const { error } = await moneySupabase.rpc('create_wallet_account', {
    p_space_id: input.spaceId,
    p_name: input.name.trim(),
    p_opening_balance: input.openingBalance,
    p_balance_date: dateOnly(new Date()),
    p_institution: input.institution?.trim() || null,
    p_type: input.type,
    p_available_for_spending: input.availableForSpending,
  })
  if (error) throw error
}

export async function createWalletCard(input: {
  spaceId: string
  name: string
  closingDay: number
  dueDay: number
  paymentAccountId: string
  issuer?: string
  brand?: string
  lastFour?: string
  personalLimit?: number | null
}) {
  const { error } = await moneySupabase.rpc('create_wallet_card', {
    p_space_id: input.spaceId,
    p_name: input.name.trim(),
    p_closing_day: input.closingDay,
    p_due_day: input.dueDay,
    p_payment_account_id: input.paymentAccountId,
    p_issuer: input.issuer?.trim() || null,
    p_brand: input.brand?.trim() || null,
    p_last_four: input.lastFour?.trim() || null,
    p_personal_limit: input.personalLimit ?? null,
    p_issuer_limit: null,
  })
  if (error) throw error
}

export async function createDebt(input: {
  spaceId: string
  name: string
  creditor?: string
  originalAmount: number
  totalInstallments: number
  firstDue: string
  paymentAccountId: string
  interestRateMonthly?: number | null
}) {
  const { error } = await moneySupabase.rpc('create_debt_v2', {
    p_space_id: input.spaceId,
    p_name: input.name.trim(),
    p_creditor: input.creditor?.trim() || null,
    p_original_amount: input.originalAmount,
    p_total_installments: input.totalInstallments,
    p_first_due: input.firstDue,
    p_payment_account_id: input.paymentAccountId,
    p_started_on: dateOnly(new Date()),
    p_interest_rate_monthly: input.interestRateMonthly ?? null,
    p_debt_type: 'loan',
    p_notes: null,
  })
  if (error) throw error
}
