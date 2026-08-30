// =====================================================================
// lib.js — núcleo de dados, Supabase, cálculos e utilitários
// =====================================================================

import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_PROJECT_URL

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[Meu Financeiro] Variáveis do Supabase não configuradas.',
    {
      VITE_SUPABASE_URL: !!SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: !!SUPABASE_ANON_KEY
    }
  )
}

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
)

// ---------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------

export const TABLES = {
  accounts: 'accounts',
  cards: 'cards',
  categories: 'categories',
  transactions: 'transactions',
  investments: 'investments',
  objectives: 'objectives',
  properties: 'properties',
  subscriptions: 'subscriptions',
  health: 'health',
  capital_costs: 'capital_costs',
  settings: 'settings'
}

export const SETTLED = ['cleared', 'reconciled']

export const MONTH_FORMAT = 'yyyy-MM-dd'

// ---------------------------------------------------------------------
// Datas
// ---------------------------------------------------------------------

export function today() {
  const d = new Date()

  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')

  return `${y}-${m}-${day}`
}

export function iso(value) {
  if (!value) return null

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  return String(value).slice(0, 10)
}

export function toDate(value) {
  if (!value) return null

  if (value instanceof Date) return value

  const d = new Date(value)

  return Number.isNaN(d.getTime()) ? null : d
}

export function monthStart(value = today()) {
  const s = String(value).slice(0, 7)

  if (!/^\d{4}-\d{2}$/.test(s)) {
    const d = new Date()

    return new Date(
      d.getFullYear(),
      d.getMonth(),
      1
    ).toISOString().slice(0, 10)
  }

  return `${s}-01`
}

export function monthEnd(value = today()) {
  const s = String(value).slice(0, 7)

  if (!/^\d{4}-\d{2}$/.test(s)) return null

  const [year, month] = s.split('-').map(Number)
  const d = new Date(year, month, 0)

  return iso(d)
}

export function monthKey(value = today()) {
  return String(value).slice(0, 7)
}

export function currentMonth() {
  return today().slice(0, 7)
}

export function addMonths(value, amount) {
  const [year, month] = monthKey(value).split('-').map(Number)
  const d = new Date(year, month - 1 + Number(amount), 1)

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthsBetween(start, end) {
  const a = monthKey(start)
  const b = monthKey(end)

  const [ay, am] = a.split('-').map(Number)
  const [by, bm] = b.split('-').map(Number)

  return (by - ay) * 12 + (bm - am)
}

export function monthRange(start, end) {
  const result = []

  let current = monthKey(start)
  const last = monthKey(end)

  let guard = 0

  while (current <= last && guard < 2400) {
    result.push(current)
    current = addMonths(current, 1)
    guard++
  }

  return result
}

export function monthLabel(value, options = {}) {
  if (!value) return ''

  const d = toDate(monthStart(value))

  if (!d) return ''

  return new Intl.DateTimeFormat('pt-BR', {
    month: options.long ? 'long' : 'short',
    year: options.long ? 'numeric' : undefined
  })
    .format(d)
    .replace('.', '')
    .replace(/^./, (x) => x.toUpperCase())
}

export function fullDate(value) {
  const d = toDate(value)

  if (!d) return ''

  return new Intl.DateTimeFormat('pt-BR').format(d)
}

export function dayLabel(value) {
  const d = toDate(value)

  if (!d) return ''

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  }).format(d)
}

// ---------------------------------------------------------------------
// Números
// ---------------------------------------------------------------------

export function n(value, fallback = 0) {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback
  }

  const text = String(value)
    .trim()
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')

  if (!text) return fallback

  let normalized = text

  if (normalized.includes(',') && normalized.includes('.')) {
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
      normalized = normalized
        .replace(/\./g, '')
        .replace(',', '.')
    } else {
      normalized = normalized.replace(/,/g, '')
    }
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.')
  }

  const result = Number(normalized)

  return Number.isFinite(result) ? result : fallback
}

export function decimal(value, digits = 2) {
  return Number(n(value).toFixed(digits))
}

export function percent(value) {
  return n(value) * 100
}

export function money(value, options = {}) {
  const {
    hide = false,
    compact = false,
    signed = false
  } = options

  if (hide) return '••••'

  const amount = n(value)

  if (compact) {
    const abs = Math.abs(amount)

    if (abs >= 1000000) {
      return `${signed && amount > 0 ? '+' : ''}R$ ${(amount / 1000000).toLocaleString('pt-BR', {
        maximumFractionDigits: 1
      })} mi`
    }

    if (abs >= 1000) {
      return `${signed && amount > 0 ? '+' : ''}R$ ${(amount / 1000).toLocaleString('pt-BR', {
        maximumFractionDigits: 1
      })} mil`
    }
  }

  const prefix = signed && amount > 0 ? '+' : ''

  return `${prefix}${amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })}`
}

export const fmtMoney = money

export function cleanNumberInput(value) {
  return String(value ?? '')
    .replace(/[^\d,.-]/g, '')
    .replace(/(?!^)-/g, '')
    .replace(/(,.*),/g, '$1')
}

export function parseMoney(value) {
  return n(value)
}

export function sum(values) {
  return (values || []).reduce((total, value) => {
    return total + n(value)
  }, 0)
}

// ---------------------------------------------------------------------
// Segurança / erros
// ---------------------------------------------------------------------

export function friendlyError(error) {
  if (!error) return 'Ocorreu um erro.'

  const message = String(
    error.message ||
    error.error_description ||
    error.details ||
    error
  )

  if (/JWT|token|session/i.test(message)) {
    return 'Sua sessão expirou. Faça login novamente.'
  }

  if (/permission|policy|rls|row-level/i.test(message)) {
    return 'Você não tem permissão para acessar estes dados.'
  }

  if (/duplicate|unique/i.test(message)) {
    return 'Este registro já existe.'
  }

  if (/network|fetch|connection/i.test(message)) {
    return 'Não foi possível conectar ao servidor.'
  }

  return message
}

export function fingerprint(value) {
  const text = JSON.stringify(value ?? '')
  let hash = 0

  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i)
    hash |= 0
  }

  return Math.abs(hash).toString(36)
}

// ---------------------------------------------------------------------
// Supabase — usuário atual
// ---------------------------------------------------------------------

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()

  if (error) throw error

  return data?.user || null
}

// ---------------------------------------------------------------------
// Supabase — leitura
// ---------------------------------------------------------------------

export async function fetchTable(table, options = {}) {
  const {
    order = 'created_at',
    ascending = false
  } = options

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order(order, { ascending })

  if (error) {
    throw new Error(`${table}: ${friendlyError(error)}`)
  }

  return data || []
}

export async function fetchSettings() {
  const user = await getCurrentUser()

  if (!user) return {}

  const { data, error } = await supabase
    .from(TABLES.settings)
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    if (error.code === 'PGRST116') return {}
    throw error
  }

  return data || {}
}

// ---------------------------------------------------------------------
// Supabase — escrita
// ---------------------------------------------------------------------

export async function saveRow(table, payload) {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Sessão inválida. Faça login novamente.')
  }

  const clean = {
    ...payload,
    user_id: payload.user_id || user.id
  }

  Object.keys(clean).forEach((key) => {
    if (clean[key] === undefined) {
      delete clean[key]
    }
  })

  const query = clean.id
    ? supabase
        .from(table)
        .update(clean)
        .eq('id', clean.id)
        .select()
        .single()
    : supabase
        .from(table)
        .insert(clean)
        .select()
        .single()

  const { data, error } = await query

  if (error) {
    throw new Error(`${table}: ${friendlyError(error)}`)
  }

  return data
}

export async function deleteRow(table, id) {
  if (!id) throw new Error('Registro inválido.')

  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`${table}: ${friendlyError(error)}`)
  }

  return true
}

export async function insertRow(table, payload) {
  return saveRow(table, payload)
}

export async function insertMany(table, rows) {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Sessão inválida. Faça login novamente.')
  }

  const payload = rows.map((row) => ({
    ...row,
    user_id: row.user_id || user.id
  }))

  const { data, error } = await supabase
    .from(table)
    .insert(payload)
    .select()

  if (error) {
    throw new Error(`${table}: ${friendlyError(error)}`)
  }

  return data || []
}

export async function updateRow(table, id, payload) {
  return saveRow(table, {
    ...payload,
    id
  })
}

// ---------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------

export async function saveSettings(settings) {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Sessão inválida. Faça login novamente.')
  }

  const payload = {
    ...settings,
    user_id: user.id
  }

  delete payload.id
  delete payload.created_at
  delete payload.updated_at

  const { data: existing } = await supabase
    .from(TABLES.settings)
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  let query

  if (existing?.id) {
    query = supabase
      .from(TABLES.settings)
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single()
  } else {
    query = supabase
      .from(TABLES.settings)
      .insert(payload)
      .select()
      .single()
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`settings: ${friendlyError(error)}`)
  }

  return data
}

export async function ensureDefaults() {
  const user = await getCurrentUser()

  if (!user) return

  const existing = await fetchTable(TABLES.categories)

  if (existing.length > 0) return

  const defaults = [
    ['Moradia', 'expense'],
    ['Alimentação', 'expense'],
    ['Transporte', 'expense'],
    ['Saúde', 'expense'],
    ['Educação', 'expense'],
    ['Lazer', 'expense'],
    ['Assinaturas', 'expense'],
    ['Compras', 'expense'],
    ['Impostos', 'expense'],
    ['Outros', 'expense'],
    ['Salário', 'income'],
    ['Rendimentos', 'income'],
    ['Outras receitas', 'income'],
    ['Transferência', 'transfer']
  ]

  await insertMany(
    TABLES.categories,
    defaults.map(([name, kind]) => ({
      name,
      kind,
      archived: false
    }))
  )
}

// ---------------------------------------------------------------------
// Normalização
// ---------------------------------------------------------------------

export function normalize(value) {
  if (value === null || value === undefined) return ''

  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

export function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!parts.length) return 'MF'

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

// ---------------------------------------------------------------------
// Transações
// ---------------------------------------------------------------------

export function txMonth(tx) {
  return monthKey(tx?.competence_month || tx?.tx_date || tx?.date)
}

export function applyFilters(rows, filters = {}) {
  const {
    month,
    kind,
    status,
    category_id,
    account_id,
    bank_account_id,
    card_id,
    search
  } = filters

  return (rows || []).filter((row) => {
    if (month && txMonth(row) !== month) return false

    if (kind && row.kind !== kind) return false

    if (status && row.status !== status) return false

    if (category_id && row.category_id !== category_id) return false

    if (bank_account_id && row.bank_account_id !== bank_account_id) return false

    if (account_id && row.bank_account_id !== account_id) return false

    if (card_id && row.card_id !== card_id) return false

    if (search) {
      const q = normalize(search)

      const haystack = normalize([
        row.description,
        row.notes
      ].join(' '))

      if (!haystack.includes(q)) return false
    }

    return true
  })
}

export function flowForMonth(transactions, month) {
  const rows = applyFilters(transactions, { month })

  let income = 0
  let expense = 0

  rows.forEach((tx) => {
    const amount = Math.abs(n(tx.amount))

    if (tx.kind === 'income') {
      income += amount
    } else if (tx.kind === 'expense' || tx.kind === 'card_payment') {
      expense += amount
    }
  })

  return {
    income,
    expense,
    result: income - expense
  }
}

export function flowSeries(transactions, start, end) {
  return monthRange(start, end).map((month) => ({
    month,
    ...flowForMonth(transactions, month)
  }))
}

// ---------------------------------------------------------------------
// Contas
// ---------------------------------------------------------------------

export function accountLedgerBalance(accounts, transactions, accountId) {
  const account = (accounts || []).find((a) => a.id === accountId)

  let balance = n(account?.initial_balance)

  ;(transactions || []).forEach((tx) => {
    if (tx.bank_account_id !== accountId) return

    if (tx.kind === 'transfer') {
      balance += n(tx.amount)
      return
    }

    balance += n(tx.amount)
  })

  return balance
}

export function accountsOverview(accounts, transactions) {
  return (accounts || []).map((account) => ({
    ...account,
    balance: accountLedgerBalance(
      accounts,
      transactions,
      account.id
    )
  }))
}

export function totalCash(accounts, transactions) {
  return sum(
    accountsOverview(accounts, transactions)
      .filter((a) => !a.archived)
      .map((a) => a.balance)
  )
}

// ---------------------------------------------------------------------
// Cartões
// ---------------------------------------------------------------------

export function cardLedgerDebt(transactions, cardId) {
  return sum(
    (transactions || [])
      .filter((tx) => tx.card_id === cardId)
      .filter((tx) => tx.kind === 'expense')
      .map((tx) => Math.abs(n(tx.amount)))
  )
}

export function cardInvoice(transactions, cardId, month) {
  return sum(
    (transactions || [])
      .filter((tx) => tx.card_id === cardId)
      .filter((tx) => tx.kind === 'expense')
      .filter((tx) => txMonth(tx) === month)
      .map((tx) => Math.abs(n(tx.amount)))
  )
}

export function cardsOverview(cards, transactions, month) {
  return (cards || []).map((card) => ({
    ...card,
    debt: cardLedgerDebt(transactions, card.id),
    invoice: cardInvoice(transactions, card.id, month)
  }))
}

export function totalCardDebt(cards, transactions) {
  return sum(
    (cards || [])
      .filter((c) => !c.archived)
      .map((c) => cardLedgerDebt(transactions, c.id))
  )
}

// ---------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------

export function categorize(transactions, categories) {
  const map = new Map(
    (categories || []).map((category) => [
      category.id,
      category.name
    ])
  )

  return (transactions || []).map((tx) => ({
    ...tx,
    category_name: map.get(tx.category_id) || 'Sem categoria'
  }))
}

export function groupByCategory(transactions, categories) {
  const rows = categorize(transactions, categories)
  const map = new Map()

  rows.forEach((tx) => {
    if (tx.kind !== 'expense') return

    const name = tx.category_name || 'Sem categoria'
    const value = Math.abs(n(tx.amount))

    map.set(name, (map.get(name) || 0) + value)
  })

  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

// ---------------------------------------------------------------------
// Investimentos
// ---------------------------------------------------------------------

export function totalInvested(investments = []) {
  return sum(
    investments
      .filter((i) => !i.archived)
      .map((i) => n(i.current_value ?? i.value))
  )
}

export function projectInvestments(
  investments,
  months = 12
) {
  return (investments || [])
    .filter((i) => !i.archived)
    .map((investment) => {
      const initial = n(
        investment.current_value ??
        investment.value
      )

      const rate = monthlyRateOf(
        investment.monthly_rate ??
        investment.rate ??
        0
      )

      const contribution = n(
        investment.monthly_contribution
      )

      const series = []

      let value = initial

      for (let i = 0; i <= months; i++) {
        series.push({
          month: i,
          value
        })

        value = value * (1 + rate) + contribution
      }

      return {
        ...investment,
        projection: series
      }
    })
}

export function monthlyRateOf(value) {
  const v = n(value)

  if (Math.abs(v) > 1) {
    return v / 100
  }

  return v
}

// ---------------------------------------------------------------------
// Patrimônio
// ---------------------------------------------------------------------

export function netWorth({
  accounts = [],
  transactions = [],
  investments = [],
  properties = []
}) {
  const cash = totalCash(accounts, transactions)
  const invested = totalInvested(investments)

  const propertyValue = sum(
    properties
      .filter((p) => !p.archived)
      .map((p) => n(p.current_value ?? p.value))
  )

  const debts = sum(
    accounts
      .filter((a) => !a.archived)
      .map((a) => Math.max(0, -accountLedgerBalance(
        accounts,
        transactions,
        a.id
      )))
  )

  const cardDebt = totalCardDebt([], transactions)

  return {
    cash,
    investments: invested,
    properties: propertyValue,
    liabilities: debts + cardDebt,
    net_worth: cash + invested + propertyValue - debts - cardDebt
  }
}

// ---------------------------------------------------------------------
// Compromissos / recorrências
// ---------------------------------------------------------------------

export function nextOccurrence(record, from = today()) {
  const date = toDate(
    record?.next_date ||
    record?.due_date ||
    record?.start_date ||
    from
  )

  if (!date) return null

  const frequency = record?.frequency || 'monthly'

  if (frequency === 'weekly') {
    date.setDate(date.getDate() + 7)
  } else if (frequency === 'yearly') {
    date.setFullYear(date.getFullYear() + 1)
  } else {
    date.setMonth(date.getMonth() + 1)
  }

  return iso(date)
}

export function occurrencesIn(record, month) {
  if (!record) return []

  const result = []
  const start = toDate(record.start_date || record.date)
  const end = toDate(record.end_date)

  if (!start) return result

  const targetStart = toDate(monthStart(month))
  const targetEnd = toDate(monthEnd(month))

  if (!targetStart || !targetEnd) return result

  let cursor = new Date(start)
  let guard = 0

  while (cursor <= targetEnd && guard < 5000) {
    if (cursor >= targetStart) {
      result.push(iso(cursor))
    }

    const frequency = record.frequency || 'monthly'

    if (frequency === 'weekly') {
      cursor.setDate(cursor.getDate() + 7)
    } else if (frequency === 'yearly') {
      cursor.setFullYear(cursor.getFullYear() + 1)
    } else if (frequency === 'daily') {
      cursor.setDate(cursor.getDate() + 1)
    } else {
      cursor.setMonth(cursor.getMonth() + 1)
    }

    guard++

    if (end && cursor > end) break
  }

  return result
}

export function dueDateInMonth(record, month) {
  const date = toDate(record?.due_date || record?.date)

  if (!date) return null

  const target = monthKey(month)

  return `${target}-${String(
    Math.min(
      date.getDate(),
      Number(monthEnd(month).slice(-2))
    )
  ).padStart(2, '0')}`
}

export function commitmentsForMonth(
  subscriptions,
  month
) {
  return (subscriptions || [])
    .filter((item) => !item.archived)
    .flatMap((item) => {
      const dates = occurrencesIn(item, month)

      return dates.map((date) => ({
        ...item,
        occurrence_date: date,
        amount: n(item.amount)
      }))
    })
}

// ---------------------------------------------------------------------
// Caixa projetado
// ---------------------------------------------------------------------

export function cashProjection({
  accounts = [],
  transactions = [],
  subscriptions = [],
  start = currentMonth(),
  months = 12
}) {
  const balances = []
  let balance = totalCash(accounts, transactions)

  for (let i = 0; i < months; i++) {
    const month = addMonths(start, i)

    const flow = flowForMonth(
      transactions,
      month
    )

    const recurring = sum(
      commitmentsForMonth(
        subscriptions,
        month
      ).map((x) => n(x.amount))
    )

    balance += flow.income - flow.expense - recurring

    balances.push({
      month,
      balance
    })
  }

  return balances
}

export function reservePlan({
  monthlyExpenses = 0,
  months = 6
}) {
  return n(monthlyExpenses) * n(months)
}

export function pendingInterest({
  principal = 0,
  monthlyRate = 0,
  months = 1
}) {
  const p = n(principal)
  const r = monthlyRateOf(monthlyRate)
  const m = Math.max(0, n(months))

  return p * (Math.pow(1 + r, m) - 1)
}

// ---------------------------------------------------------------------
// Objetivos
// ---------------------------------------------------------------------

export function objectivesOverview(
  objectives = [],
  investments = []
) {
  return objectives
    .filter((o) => !o.archived)
    .map((objective) => {
      const linked = investments
        .filter((i) => i.objective_id === objective.id)

      const current = sum(
        linked.map((i) => n(
          i.current_value ?? i.value
        ))
      )

      const target = n(objective.target_value)

      return {
        ...objective,
        current_value: current,
        target_value: target,
        progress: target > 0
          ? Math.min(1, current / target)
          : 0,
        remaining: Math.max(0, target - current)
      }
    })
}

// ---------------------------------------------------------------------
// Padrões / importação
// ---------------------------------------------------------------------

export function suggestPattern(description, patterns = []) {
  const target = normalize(description)

  if (!target) return null

  let best = null
  let bestScore = 0

  patterns.forEach((pattern) => {
    const source = normalize(
      pattern.description ||
      pattern.pattern ||
      pattern.name
    )

    if (!source) return

    let score = 0

    if (target === source) {
      score = 1
    } else if (
      target.includes(source) ||
      source.includes(target)
    ) {
      score = 0.8
    } else {
      const words = source.split(/\s+/)

      const hits = words.filter(
        (word) => word.length > 2 && target.includes(word)
      ).length

      score = words.length
        ? hits / words.length
        : 0
    }

    if (score > bestScore) {
      bestScore = score
      best = pattern
    }
  })

  return bestScore >= 0.5 ? best : null
}

export function parseStatementDate(value) {
  if (!value) return null

  const text = String(value).trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text
  }

  const br = text.match(
    /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/
  )

  if (br) {
    let year = Number(br[3])

    if (year < 100) year += 2000

    return `${year}-${String(Number(br[2])).padStart(2, '0')}-${String(Number(br[1])).padStart(2, '0')}`
  }

  const d = new Date(text)

  return Number.isNaN(d.getTime()) ? null : iso(d)
}

export function parseStatementDateSafe(value) {
  try {
    return parseStatementDate(value)
  } catch {
    return null
  }
}

export function parseStatementDateOrNull(value) {
  return parseStatementDateSafe(value)
}

export function parseCsv(text) {
  const source = String(text || '')
    .replace(/^\uFEFF/, '')

  if (!source.trim()) return []

  const lines = source
    .split(/\r?\n/)
    .filter((line) => line.trim())

  if (!lines.length) return []

  const delimiter =
    lines[0].includes(';')
      ? ';'
      : lines[0].includes('\t')
        ? '\t'
        : ','

  const parseLine = (line) => {
    const result = []
    let current = ''
    let quoted = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          quoted = !quoted
        }
      } else if (char === delimiter && !quoted) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    result.push(current.trim())

    return result
  }

  const headers = parseLine(lines[0])

  return lines.slice(1).map((line) => {
    const values = parseLine(line)

    return headers.reduce((row, header, index) => {
      row[header] = values[index] ?? ''
      return row
    }, {})
  })
}

export function parseOfx(text) {
  const source = String(text || '')
  const rows = []

  const transactions =
    source.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || []

  transactions.forEach((block) => {
    const get = (tag) => {
      const match = block.match(
        new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i')
      )

      return match?.[1]?.trim() || ''
    }

    rows.push({
      date: parseStatementDate(
        get('DTPOSTED').slice(0, 8)
      ),
      amount: n(get('TRNAMT')),
      description:
        get('MEMO') ||
        get('NAME') ||
        'Lançamento importado',
      fitid: get('FITID'),
      type: get('TRNTYPE')
    })
  })

  return rows
}

export function parseStatement(text, filename = '') {
  const name = String(filename).toLowerCase()

  if (name.endsWith('.ofx') || name.endsWith('.qfx')) {
    return parseOfx(text)
  }

  return parseCsv(text)
}

// ---------------------------------------------------------------------
// Legado / compatibilidade
// ---------------------------------------------------------------------

export function baseline(value, fallback = 0) {
  const result = n(value, NaN)

  return Number.isFinite(result)
    ? result
    : fallback
}

export function withOccurrenceIndex(rows = []) {
  const counters = new Map()

  return rows.map((row) => {
    const key = row.subscription_id || row.id || 'default'
    const index = counters.get(key) || 0

    counters.set(key, index + 1)

    return {
      ...row,
      occurrence_index: index
    }
  })
}

export const defaultHints = {
  account:
    'Use este campo para identificar claramente a conta.',
  category:
    'Escolha a categoria que melhor representa o lançamento.',
  objective:
    'Defina o objetivo para acompanhar sua evolução.',
  investment:
    'Informe o investimento relacionado ao aporte.'
}
