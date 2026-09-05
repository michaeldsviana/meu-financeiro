/* =====================================================================
   lib.js — cliente Supabase, formatação, datas, motor financeiro,
   leitura de extratos, regras de categorização e acesso ao banco.
   ===================================================================== */
import { createClient } from '@supabase/supabase-js'

/* ---------- supabase ---------- */
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.')
}

export const supabase = createClient(url || '', key || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

/* ---------- format ---------- */
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1
})
const num = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 2 })

export const n = (v) => {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

export const money = (v, { hide = false, compact = false } = {}) => {
  if (hide) return 'R$ ••••'
  return compact ? brlCompact.format(n(v)) : brl.format(n(v))
}

export const decimal = (v) => num.format(n(v))
export const percent = (v) => pct.format(n(v))

/** Converte "1.234,56", "1234.56", "R$ 1.234,56", "(120,00)" em número. */
export function parseMoney(input) {
  if (input == null) return 0
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0
  let s = String(input).trim()
  if (!s) return 0
  let negative = false
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1) }
  if (/-/.test(s)) negative = true
  if (/\bC\b|CRED|CRÉD/i.test(s) && !/\bD\b|DEB|DÉB/i.test(s)) negative = false
  s = s.replace(/[^0-9,.]/g, '')
  if (!s) return 0
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.')
  else s = s.replace(/,/g, '')
  const value = Number(s)
  if (!Number.isFinite(value)) return 0
  return negative ? -Math.abs(value) : value
}

/** Máscara para campos de valor: mantém apenas dígitos e vírgula/ponto. */
export const cleanNumberInput = (s) => String(s ?? '').replace(/[^\d.,-]/g, '')

export const initials = (text = '') =>
  text.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase()

/** Slug simples para comparar descrições de extrato. */
export const normalize = (s = '') =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()

/* ---------- dates ---------- */
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** Datas do banco vêm como 'YYYY-MM-DD'. Nunca use new Date(str) direto (fuso). */
export function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  const s = String(value)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

export const iso = (d) => {
  const date = toDate(d)
  if (!date) return null
  const p = (x) => String(x).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

export const today = () => iso(new Date())

/** 'YYYY-MM' */
export const monthKey = (d) => {
  const date = toDate(d)
  if (!date) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export const currentMonth = () => monthKey(new Date())

/** Primeiro dia do mês, em ISO — usado em competence_month. */
export const monthStart = (key) => `${key}-01`

export const monthEnd = (key) => {
  const [y, m] = key.split('-').map(Number)
  return iso(new Date(y, m, 0))
}

export function addMonths(key, delta) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return monthKey(d)
}

export function monthRange(startKey, count) {
  return Array.from({ length: count }, (_, i) => addMonths(startKey, i))
}

/** Diferença em meses entre dois 'YYYY-MM'. */
export function monthsBetween(a, b) {
  const [ya, ma] = a.split('-').map(Number)
  const [yb, mb] = b.split('-').map(Number)
  return (yb - ya) * 12 + (mb - ma)
}

export const monthLabel = (key, { long = false } = {}) => {
  if (!key) return ''
  const [y, m] = key.split('-').map(Number)
  const name = long ? MONTHS_LONG[m - 1] : MONTHS[m - 1]
  return long ? `${name} de ${y}` : `${name}/${String(y).slice(2)}`
}

export const dayLabel = (d) => {
  const date = toDate(d)
  if (!date) return '—'
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
}

export const fullDate = (d) => {
  const date = toDate(d)
  if (!date) return '—'
  return date.toLocaleDateString('pt-BR')
}

/** Próxima ocorrência de uma obrigação recorrente a partir de um mês. */
export function nextOccurrence(dateStr, frequency, fromKey) {
  const start = toDate(dateStr)
  if (!start) return null
  const step = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12, once: 0 }[frequency] ?? 1
  let key = monthKey(start)
  if (step === 0) return monthsBetween(fromKey, key) >= 0 ? key : null
  while (monthsBetween(fromKey, key) < 0) key = addMonths(key, step)
  return key
}

/** Todos os meses em que a obrigação incide dentro da janela. */
export function occurrencesIn(dateStr, frequency, months, occurrencesLeft) {
  const start = toDate(dateStr)
  if (!start || !months.length) return []
  const step = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12, once: 0 }[frequency] ?? 1
  const out = []
  if (step === 0) {
    const k = monthKey(start)
    return months.includes(k) ? [k] : []
  }
  const last = months[months.length - 1]
  let key = monthKey(start)
  while (monthsBetween(months[0], key) < 0) key = addMonths(key, step)
  let guard = 0
  while (monthsBetween(key, last) >= 0 && guard < 600) {
    if (occurrencesLeft != null && out.length >= occurrencesLeft) break
    out.push(key)
    key = addMonths(key, step)
    guard += 1
  }
  return out
}

export function dueDateInMonth(key, day) {
  if (!day) return monthEnd(key)
  const [y, m] = key.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return iso(new Date(y, m - 1, Math.min(Number(day), lastDay)))
}

/* ---------- finance ---------- */
/*
 * Convenções do modelo
 * -------------------------------------------------------------------
 * transactions.amount é assinado: entradas positivas, saídas negativas.
 * kind:
 *   income        receita
 *   expense       despesa (conta ou cartão)
 *   transfer      entre contas próprias — não é receita nem despesa
 *   investment    aporte — sai do caixa, entra no patrimônio investido
 *   card_payment  pagamento de fatura — sai do caixa, abate a dívida do cartão
 * status: planned (previsto) | pending | cleared | reconciled
 *
 * Saldo de caixa do patrimônio = saldo INFORMADO pelo usuário em cada conta.
 * Saldo do razão = saldo inicial + lançamentos liquidados. A diferença entre
 * os dois é exatamente o que a tela de conciliação mostra.
 */

export const SETTLED = ['cleared', 'reconciled']
const isSettled = (t) => SETTLED.includes(t.status)
export const txMonth = (t) => monthKey(t.competence_month || t.tx_date)

export const sum = (list, pick = (x) => x) => list.reduce((acc, x) => acc + n(pick(x)), 0)

// ---------------------------------------------------------------------
// Contas
// ---------------------------------------------------------------------
export function accountLedgerBalance(account, transactions, upTo) {
  const limit = upTo ? toDate(upTo) : null
  const moves = transactions.filter((t) => {
    if (!isSettled(t)) return false
    if (limit && toDate(t.tx_date) > limit) return false
    return t.bank_account_id === account.id || t.counterparty_account_id === account.id
  })
  return moves.reduce((acc, t) => {
    // Numa transferência, a conta de destino recebe o valor com sinal invertido.
    if (t.counterparty_account_id === account.id && t.bank_account_id !== account.id) {
      return acc + Math.abs(n(t.amount))
    }
    return acc + n(t.amount)
  }, n(account.initial_balance))
}

export function accountsOverview(accounts, transactions) {
  return accounts.map((a) => {
    const ledger = accountLedgerBalance(a, transactions)
    const informed = n(a.current_balance)
    return { ...a, ledger, informed, difference: informed - ledger }
  })
}

export const totalCash = (accounts) => sum(accounts, (a) => a.current_balance)

// ---------------------------------------------------------------------
// Cartões
// ---------------------------------------------------------------------
export function cardLedgerDebt(card, transactions) {
  const purchases = transactions.filter((t) => t.card_id === card.id && t.kind === 'expense')
  const payments = transactions.filter((t) => t.card_id === card.id && t.kind === 'card_payment')
  return sum(purchases, (t) => Math.abs(n(t.amount))) - sum(payments, (t) => Math.abs(n(t.amount)))
}

export function cardsOverview(cards, transactions) {
  return cards.map((c) => {
    const ledger = cardLedgerDebt(c, transactions)
    const informed = n(c.current_balance)
    const limit = n(c.credit_limit)
    return {
      ...c,
      ledger,
      informed,
      difference: informed - ledger,
      available: limit - informed,
      usage: limit > 0 ? Math.min(1, informed / limit) : 0
    }
  })
}

export const totalCardDebt = (cards) => sum(cards, (c) => c.current_balance)

/** Fatura fechada de um mês: compras entre os fechamentos. */
export function cardInvoice(card, transactions, key) {
  const closing = card.closing_day || 1
  const end = dueDateInMonth(key, closing)
  const start = dueDateInMonth(addMonths(key, -1), closing)
  const items = transactions.filter(
    (t) => t.card_id === card.id && t.kind === 'expense' && t.tx_date > start && t.tx_date <= end
  )
  return {
    items,
    total: sum(items, (t) => Math.abs(n(t.amount))),
    closesOn: end,
    dueOn: dueDateInMonth(card.due_day && card.due_day < closing ? addMonths(key, 1) : key, card.due_day)
  }
}

// ---------------------------------------------------------------------
// Investimentos
// ---------------------------------------------------------------------
export const monthlyRateOf = (inv) => {
  const r = n(inv.monthly_rate)
  if (inv.rate_basis === 'annual') return Math.pow(1 + r, 1 / 12) - 1
  return r
}

export const totalInvested = (investments) =>
  sum(investments.filter((i) => !i.archived), (i) => i.current_value)

export function objectivesOverview(objectives, investments, allocations) {
  return objectives.map((o) => {
    const linked = investments.filter((i) => i.objective_id === o.id && !i.archived)
    const current = sum(linked, (i) => i.current_value)
    const contributed = sum(
      allocations.filter((a) => a.objective_id === o.id || linked.some((i) => i.id === a.investment_id)),
      (a) => a.amount
    )
    const target = n(o.target_amount)
    const missing = Math.max(0, target - current)
    const monthsLeft = o.target_date
      ? Math.max(0, monthsBetween(currentMonth(), monthKey(o.target_date)))
      : null
    const rate = linked.length
      ? linked.reduce((acc, i) => acc + monthlyRateOf(i) * n(i.current_value), 0) / (current || 1)
      : 0
    // Aporte mensal necessário considerando juros compostos (série uniforme).
    let needed = 0
    if (target > 0 && monthsLeft && monthsLeft > 0) {
      const future = current * Math.pow(1 + rate, monthsLeft)
      const gap = Math.max(0, target - future)
      needed = rate > 0
        ? gap * rate / (Math.pow(1 + rate, monthsLeft) - 1)
        : gap / monthsLeft
    }
    return {
      ...o,
      investments: linked,
      current,
      contributed,
      target,
      missing,
      monthsLeft,
      monthlyRate: rate,
      neededMonthly: needed,
      progress: target > 0 ? Math.min(1, current / target) : null
    }
  })
}

/** Projeção de cada investimento com juros compostos + aportes mensais. */
export function projectInvestments(investments, months, contributionByObjective = {}) {
  const alive = investments.filter((i) => !i.archived)
  return months.map((key, idx) => {
    let total = 0
    alive.forEach((inv) => {
      const rate = monthlyRateOf(inv)
      const contribution = n(contributionByObjective[inv.objective_id] || 0) /
        Math.max(1, alive.filter((x) => x.objective_id === inv.objective_id).length)
      let value = n(inv.current_value)
      for (let m = 0; m < idx; m += 1) value = value * (1 + rate) + contribution
      total += value
    })
    return { month: key, value: total }
  })
}

/** Juros do mês a lançar, por investimento. */
export function pendingInterest(investments, interestRows, key) {
  return investments
    .filter((i) => !i.archived && monthlyRateOf(i) !== 0)
    .filter((i) => !interestRows.some(
      (r) => r.investment_id === i.id && monthKey(r.reference_month) === key
    ))
    .map((i) => {
      const rate = monthlyRateOf(i)
      return {
        investment: i,
        rate,
        base: n(i.current_value),
        interest: n(i.current_value) * rate
      }
    })
}

// ---------------------------------------------------------------------
// Compromissos recorrentes
// ---------------------------------------------------------------------
/** Todos os compromissos previstos que caem num mês, com origem identificada. */
/**
 * Um compromisso cadastrado (assinatura, condomínio, parcela) e o lançamento
 * correspondente no razão são a mesma despesa vista de dois ângulos. Sem
 * casar os dois, o mês soma tudo em dobro.
 *
 * O casamento é deliberadamente conservador: exige valor igual e mais um
 * ponto de contato — mesma categoria, mesmo cartão, mesma conta ou o nome
 * aparecendo na descrição. Na dúvida, considera NÃO casado, o que faz o
 * sistema prever gasto a mais em vez de esconder gasto.
 */
export function settledCommitment(commitment, transactions, key) {
  const alvo = Math.abs(n(commitment.amount))
  if (alvo === 0) return null
  const nome = normalize(commitment.name || '')

  return transactions.find((t) => {
    if (txMonth(t) !== key) return false
    if (t.kind !== 'expense' && t.kind !== 'card_payment') return false
    if (Math.abs(Math.abs(n(t.amount)) - alvo) > 0.01) return false

    const mesmaCategoria = commitment.category_id && t.category_id === commitment.category_id
    const mesmoCartao = commitment.card_id && t.card_id === commitment.card_id
    const mesmaConta = commitment.bank_account_id && t.bank_account_id === commitment.bank_account_id
    const descricaoBate = nome.length > 3 && normalize(t.description || '').includes(nome.split(' ')[0])

    return Boolean(mesmaCategoria || mesmoCartao || mesmaConta || descricaoBate)
  }) || null
}

/**
 * Visão consolidada de um mês: o que já passou pelo razão, o que está
 * cadastrado como recorrente e ainda não apareceu, e o total esperado.
 *
 * É o número que responde "quanto este mês vai custar", em vez de
 * "quanto eu já registrei".
 */
export function monthOverview(data, key) {
  const flow = flowForMonth(data.transactions, key)
  const commitments = commitmentsForMonth(data, key).map((c) => {
    const match = settledCommitment(c, data.transactions, key)
    return { ...c, settled: Boolean(match), transaction_id: match?.id || null }
  })

  const pendentes = commitments.filter((c) => !c.settled)
  const aPagar = sum(pendentes, (c) => c.amount)

  return {
    ...flow,
    commitments,
    pendentes,
    lancado: flow.expense,
    aPagar,
    totalEsperado: flow.expense + aPagar,
    resultadoEsperado: flow.income - flow.expense - aPagar,
    cobertura: commitments.length ? (commitments.length - pendentes.length) / commitments.length : 1
  }
}

export function commitmentsForMonth(data, key) {
  const items = []

  data.subscriptions
    .filter((s) => s.active !== false)
    .forEach((s) => {
      const freq = s.frequency || 'monthly'
      const base = s.next_billing_date || s.started_on || `${key}-01`
      // Uma assinatura não pode gerar compromisso em mês anterior ao seu início.
      const startKey = monthKey(s.started_on || s.next_billing_date || `${key}-01`)
      if (monthsBetween(startKey, key) < 0) return
      const hits = occurrencesIn(base, freq, [key])
      if (hits.length || freq === 'monthly') {
        items.push({
          id: `sub-${s.id}`, source: 'Assinatura', name: s.name,
          amount: n(s.monthly_amount), date: dueDateInMonth(key, s.billing_day),
          card_id: s.card_id, bank_account_id: s.bank_account_id, category_id: s.category_id
        })
      }
    })

  data.propertyObligations
    .filter((o) => o.active !== false)
    .forEach((o) => {
      const hits = occurrencesIn(o.next_due_date, o.frequency, [key], o.occurrences_left)
      if (hits.length) {
        const property = data.properties.find((p) => p.id === o.property_id)
        items.push({
          id: `obl-${o.id}`, source: 'Imóvel', name: `${o.name}${property ? ` · ${property.name}` : ''}`,
          amount: n(o.amount), date: o.next_due_date, bank_account_id: o.bank_account_id,
          category_id: o.category_id
        })
      }
    })

  data.liabilities
    .filter((l) => l.active !== false && n(l.monthly_payment) > 0)
    .forEach((l) => {
      const startKey = l.next_due_date ? monthKey(l.next_due_date) : currentMonth()
      const offset = monthsBetween(startKey, key)
      if (offset < 0) return
      if (l.remaining_months != null && offset >= l.remaining_months) return
      items.push({
        id: `lia-${l.id}`, source: 'Dívida', name: l.name,
        amount: n(l.monthly_payment),
        date: dueDateInMonth(key, l.next_due_date ? toDate(l.next_due_date).getDate() : 10),
        bank_account_id: l.bank_account_id
      })
    })

  /*
   * Saúde e capital: o registro vale no mês de competência dele. Se estiver
   * marcado como recorrente, ele também projeta os meses seguintes — mas só
   * enquanto não existir um registro próprio daquele mês, para o lançamento
   * real substituir a projeção em vez de somar em cima dela.
   */
  const periodicos = (rows, source, label) => {
    rows.forEach((r) => {
      const ref = monthKey(r.reference_month)
      const offset = monthsBetween(ref, key)
      if (offset < 0) return

      if (offset === 0) {
        if (r.paid) return
      } else {
        if (!r.recurring) return
        const jaExiste = rows.some((o) =>
          o.id !== r.id &&
          monthKey(o.reference_month) === key &&
          normalize(o.description || '') === normalize(r.description || ''))
        if (jaExiste) return
      }

      items.push({
        id: `${label}-${r.id}${offset ? `-${key}` : ''}`,
        source,
        name: r.description,
        amount: n(r.amount),
        date: offset === 0 ? (r.due_date || r.reference_month) : dueDateInMonth(key, r.due_date ? toDate(r.due_date).getDate() : 10),
        projected: offset > 0,
        bank_account_id: r.bank_account_id,
        category_id: r.category_id
      })
    })
  }

  periodicos(data.healthCosts, 'Saúde', 'hea')
  periodicos(data.capitalCosts, 'Capital', 'cap')

  return items.sort((a, b) => String(a.date).localeCompare(String(b.date)))
}

// ---------------------------------------------------------------------
// Fluxo de caixa realizado
// ---------------------------------------------------------------------
export function flowForMonth(transactions, key) {
  const rows = transactions.filter((t) => txMonth(t) === key)
  const settled = rows.filter(isSettled)
  const income = sum(settled.filter((t) => t.kind === 'income'), (t) => n(t.amount))
  const expense = sum(settled.filter((t) => t.kind === 'expense'), (t) => Math.abs(n(t.amount)))
  const invested = sum(settled.filter((t) => t.kind === 'investment'), (t) => Math.abs(n(t.amount)))
  const cardPaid = sum(settled.filter((t) => t.kind === 'card_payment'), (t) => Math.abs(n(t.amount)))
  const planned = rows.filter((t) => t.status === 'planned')
  return {
    month: key,
    rows,
    income,
    expense,
    invested,
    cardPaid,
    result: income - expense,
    cash: income - expense - invested,
    plannedIncome: sum(planned.filter((t) => t.kind === 'income'), (t) => n(t.amount)),
    plannedExpense: sum(
      planned.filter((t) => ['expense', 'investment', 'card_payment'].includes(t.kind)),
      (t) => Math.abs(n(t.amount))
    )
  }
}

export const flowSeries = (transactions, months) => months.map((k) => flowForMonth(transactions, k))

/** Média das receitas/despesas realizadas nos últimos meses completos. */
export function baseline(transactions, monthsBack = 3, reference = currentMonth()) {
  const keys = monthRange(addMonths(reference, -monthsBack), monthsBack)
  const rows = keys.map((k) => flowForMonth(transactions, k))
  const withData = rows.filter((r) => r.income > 0 || r.expense > 0)
  if (!withData.length) return { income: 0, expense: 0, months: 0 }
  return {
    income: sum(withData, (r) => r.income) / withData.length,
    expense: sum(withData, (r) => r.expense) / withData.length,
    months: withData.length
  }
}

// ---------------------------------------------------------------------
// Previsão de caixa
// ---------------------------------------------------------------------
/**
 * Projeta o saldo de caixa mês a mês.
 * Cada mês futuro = receitas previstas − compromissos conhecidos − despesa variável estimada.
 * A despesa variável estimada é a média histórica descontada dos compromissos,
 * para não contar o mesmo gasto duas vezes.
 */
/**
 * Média da despesa que NÃO é recorrente conhecida.
 *
 * A versão anterior fazia "média histórica menos compromissos cadastrados".
 * O problema: ela presumia que todo compromisso já estava dentro da média.
 * Quem cadastrasse o financiamento e o plano de saúde sem nunca tê-los
 * lançado via a subtração zerar o mercado, e a previsão passava a supor
 * que não se gasta nada além das contas fixas.
 *
 * Agora a conta é feita mês a mês: do total gasto, tira-se apenas o que
 * casou com um compromisso naquele mês. O que sobra é gasto variável de
 * verdade. Se o recorrente nunca apareceu no razão, ele não é descontado
 * de nada — e continua sendo somado à parte.
 */
export function variableBaseline(data, monthsBack = 3, reference = currentMonth()) {
  const keys = monthRange(addMonths(reference, -monthsBack), monthsBack)
  const amostras = []

  keys.forEach((k) => {
    const flow = flowForMonth(data.transactions, k)
    if (flow.income === 0 && flow.expense === 0) return
    const casados = sum(
      commitmentsForMonth(data, k).filter((c) => settledCommitment(c, data.transactions, k)),
      (c) => c.amount
    )
    amostras.push(Math.max(0, flow.expense - casados))
  })

  if (!amostras.length) return { expense: 0, months: 0 }
  return { expense: sum(amostras, (v) => v) / amostras.length, months: amostras.length }
}

export function cashProjection(data, { from = currentMonth(), horizon = 12 } = {}) {
  const months = monthRange(from, horizon)
  const base = baseline(data.transactions, 3, from)
  const variableEstimate = variableBaseline(data, 3, from).expense

  let balance = totalCash(data.accounts)
  const nowKey = currentMonth()

  return months.map((key, idx) => {
    const realized = flowForMonth(data.transactions, key)
    const isPast = monthsBetween(key, nowKey) > 0
    const isCurrent = key === nowKey

    const commitments = commitmentsForMonth(data, key)
    const committed = sum(commitments, (c) => c.amount)

    let income
    let expense
    let mode

    if (isPast) {
      income = realized.income
      expense = realized.expense + realized.invested
      mode = 'realizado'
    } else if (isCurrent) {
      /*
       * Mês corrente: o que já passou pelo razão, mais os compromissos que
       * ainda não apareceram nele. Antes havia um fator de 0,6 aqui, um chute
       * para compensar a chance de o compromisso já estar entre as despesas
       * lançadas. Agora cada compromisso é casado com o lançamento
       * correspondente, então não há mais o que adivinhar.
       */
      const pendentes = commitments.filter((c) => !settledCommitment(c, data.transactions, key))
      income = Math.max(realized.income, realized.income + realized.plannedIncome)
      expense = realized.expense + realized.invested + sum(pendentes, (c) => c.amount)
      mode = 'em curso'
    } else {
      income = realized.plannedIncome > 0 ? realized.plannedIncome : base.income
      expense = committed + variableEstimate + realized.plannedExpense
      mode = 'previsto'
    }

    const net = income - expense
    if (idx > 0 || !isPast) balance += net
    return {
      month: key, income, expense, net, balance, mode,
      committed, variableEstimate, commitments
    }
  })
}

// ---------------------------------------------------------------------
// Reserva para obrigações futuras
// ---------------------------------------------------------------------
/**
 * Para cada obrigação não mensal, calcula quanto guardar por mês até o vencimento.
 * É a resposta à pergunta "quanto devo reservar este mês?".
 */
export function reservePlan(data, from = currentMonth()) {
  const items = []

  data.propertyObligations
    .filter((o) => o.active !== false && o.accumulate !== false && n(o.amount) > 0)
    .forEach((o) => {
      if (o.frequency === 'monthly') return
      const dueKey = o.next_due_date ? monthKey(o.next_due_date) : null
      if (!dueKey) return
      const monthsLeft = Math.max(0, monthsBetween(from, dueKey))
      const property = data.properties.find((p) => p.id === o.property_id)
      items.push({
        id: o.id,
        name: o.name,
        context: property?.name || 'Imóvel',
        amount: n(o.amount),
        dueKey,
        monthsLeft,
        monthly: n(o.amount) / Math.max(1, monthsLeft + 1)
      })
    })

  data.objectives
    .filter((o) => !o.archived && n(o.monthly_contribution) > 0)
    .forEach((o) => {
      items.push({
        id: o.id,
        name: o.name,
        context: 'Objetivo',
        amount: n(o.target_amount),
        dueKey: o.target_date ? monthKey(o.target_date) : null,
        monthsLeft: o.target_date ? Math.max(0, monthsBetween(from, monthKey(o.target_date))) : null,
        monthly: n(o.monthly_contribution)
      })
    })

  const emergency = n(data.settings?.emergency_reserve_target)
  const cash = totalCash(data.accounts)
  return {
    items: items.sort((a, b) => b.monthly - a.monthly),
    monthlyTotal: sum(items, (i) => i.monthly),
    emergencyTarget: emergency,
    emergencyGap: Math.max(0, emergency - cash)
  }
}

// ---------------------------------------------------------------------
// Patrimônio líquido
// ---------------------------------------------------------------------
export function netWorth(data) {
  const cash = totalCash(data.accounts)
  const investments = totalInvested(data.investments)
  const properties = sum(data.properties.filter((p) => !p.archived), (p) => p.market_value)
  const cards = totalCardDebt(data.cards)
  const debts = sum(data.liabilities.filter((l) => l.active !== false), (l) => l.current_balance)
  return {
    cash,
    investments,
    properties,
    cards,
    debts,
    assets: cash + investments + properties,
    liabilities: cards + debts,
    total: cash + investments + properties - cards - debts,
    liquid: cash + investments - cards
  }
}

// ---------------------------------------------------------------------
// Agrupamentos para gráficos
// ---------------------------------------------------------------------
export function groupByCategory(transactions, categories, key, kind = 'expense') {
  const map = new Map()
  transactions
    .filter((t) => txMonth(t) === key && t.kind === kind && isSettled(t))
    .forEach((t) => {
      const cat = categories.find((c) => c.id === t.category_id)
      const name = cat?.name || 'Sem categoria'
      map.set(name, (map.get(name) || 0) + Math.abs(n(t.amount)))
    })
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function applyFilters(transactions, f = {}) {
  return transactions.filter((t) => {
    if (f.month && txMonth(t) !== f.month) return false
    if (f.accountId && t.bank_account_id !== f.accountId) return false
    if (f.cardId && t.card_id !== f.cardId) return false
    if (f.categoryId && t.category_id !== f.categoryId) return false
    if (f.objectiveId && t.objective_id !== f.objectiveId) return false
    if (f.kind && t.kind !== f.kind) return false
    if (f.status && t.status !== f.status) return false
    if (f.search) {
      const q = f.search.toLowerCase()
      if (!String(t.description || '').toLowerCase().includes(q)) return false
    }
    return true
  })
}

/* ---------- parse ---------- */
// ---------------------------------------------------------------------
// Datas de extrato: dd/mm/aaaa, aaaa-mm-dd, dd-mm-aa, aaaammdd
// ---------------------------------------------------------------------
export function parseStatementDate(value) {
  if (!value) return null
  const s = String(value).trim()
  let m = s.match(/^(\d{2})[/\-.](\d{2})[/\-.](\d{2,4})/)
  if (m) {
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
    return iso(new Date(year, Number(m[2]) - 1, Number(m[1])))
  }
  m = s.match(/^(\d{4})[/\-.](\d{2})[/\-.](\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/^(\d{4})(\d{2})(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  const d = toDate(s)
  return d ? iso(d) : null
}

// ---------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------
function detectDelimiter(sample) {
  const candidates = [';', ',', '\t', '|']
  let best = ';'
  let bestScore = -1
  candidates.forEach((d) => {
    const counts = sample.split(/\r?\n/).slice(0, 8).filter(Boolean)
      .map((line) => line.split(d).length)
    if (!counts.length) return
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length
    const stable = counts.every((c) => Math.abs(c - avg) <= 1)
    const score = avg > 1 && stable ? avg : 0
    if (score > bestScore) { bestScore = score; best = d }
  })
  return best
}

function splitCsvLine(line, delimiter) {
  const out = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i += 1 }
      else quoted = !quoted
    } else if (ch === delimiter && !quoted) {
      out.push(cur); cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((c) => c.trim().replace(/^"|"$/g, ''))
}

const HEADER_HINTS = {
  date: ['data', 'date', 'data lancamento', 'data do lancamento', 'data movimento', 'dt', 'data compra'],
  description: ['descricao', 'description', 'historico', 'lancamento', 'memo', 'detalhes',
    'estabelecimento', 'titulo', 'movimentacao'],
  amount: ['valor', 'amount', 'value', 'montante', 'valor (r$)', 'valor em r$', 'vlr'],
  credit: ['credito', 'entrada', 'receita', 'credit'],
  debit: ['debito', 'saida', 'despesa', 'debit'],
  type: ['tipo', 'tipo de lancamento', 'd/c', 'natureza']
}

function matchHeader(header) {
  const norm = header.map((h) => normalize(h).toLowerCase())
  const find = (keys) => norm.findIndex((h) => keys.some((k) => h === k || h.includes(k)))
  return {
    date: find(HEADER_HINTS.date),
    description: find(HEADER_HINTS.description),
    amount: find(HEADER_HINTS.amount),
    credit: find(HEADER_HINTS.credit),
    debit: find(HEADER_HINTS.debit),
    type: find(HEADER_HINTS.type)
  }
}

export function parseCsv(text) {
  const clean = text.replace(/^\uFEFF/, '')
  const delimiter = detectDelimiter(clean)
  const lines = clean.split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return { rows: [], warnings: ['Arquivo vazio.'] }

  // Alguns bancos colocam cabeçalhos institucionais antes da tabela.
  let headerIndex = 0
  let map = matchHeader(splitCsvLine(lines[0], delimiter))
  for (let i = 0; i < Math.min(lines.length, 15); i += 1) {
    const candidate = matchHeader(splitCsvLine(lines[i], delimiter))
    if (candidate.date >= 0 && (candidate.amount >= 0 || candidate.credit >= 0 || candidate.debit >= 0)) {
      headerIndex = i; map = candidate; break
    }
  }

  const warnings = []
  if (map.date < 0) warnings.push('Coluna de data não identificada. Confira o arquivo.')

  const rows = []
  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i], delimiter)
    if (cells.every((c) => !c)) continue
    const date = parseStatementDate(cells[map.date])
    if (!date) continue

    let amount = 0
    if (map.amount >= 0) amount = parseMoney(cells[map.amount])
    if (!amount && map.credit >= 0) amount = Math.abs(parseMoney(cells[map.credit]))
    if (!amount && map.debit >= 0) amount = -Math.abs(parseMoney(cells[map.debit]))
    if (map.type >= 0) {
      const t = normalize(cells[map.type])
      if (/^D|DEB/.test(t)) amount = -Math.abs(amount)
      if (/^C|CRED/.test(t)) amount = Math.abs(amount)
    }
    if (!amount) continue

    const description = map.description >= 0
      ? cells[map.description]
      : cells.filter((_, idx) => idx !== map.date && idx !== map.amount).join(' ').trim()

    rows.push({ date, description: description || 'Lançamento importado', amount, raw: cells })
  }

  if (!rows.length) warnings.push('Nenhuma linha reconhecida. Verifique se o arquivo é um extrato CSV.')
  return { rows, warnings, delimiter }
}

// ---------------------------------------------------------------------
// OFX (SGML) — Banco do Brasil, Itaú, Nubank, Inter etc.
// ---------------------------------------------------------------------
export function parseOfx(text) {
  const rows = []
  const warnings = []
  const blocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || []
  const tag = (block, name) => {
    const m = block.match(new RegExp(`<${name}>([^<\r\n]*)`, 'i'))
    return m ? m[1].trim() : ''
  }
  blocks.forEach((block) => {
    const date = parseStatementDate(tag(block, 'DTPOSTED'))
    const amount = parseMoney(tag(block, 'TRNAMT'))
    if (!date || !amount) return
    const memo = tag(block, 'MEMO')
    const name = tag(block, 'NAME')
    rows.push({
      date,
      description: [name, memo].filter(Boolean).join(' — ') || 'Lançamento importado',
      amount,
      externalId: tag(block, 'FITID') || null
    })
  })
  if (!rows.length) warnings.push('Nenhuma transação encontrada no OFX.')
  return { rows, warnings }
}

export function parseStatement(fileName, text) {
  const isOfx = /\.ofx$/i.test(fileName) || /<OFX>/i.test(text.slice(0, 4000))
  return isOfx ? { ...parseOfx(text), fileType: 'ofx' } : { ...parseCsv(text), fileType: 'csv' }
}

// ---------------------------------------------------------------------
// Impressão digital para não importar a mesma linha duas vezes
// ---------------------------------------------------------------------
export function fingerprint({ target, date, amount, description, externalId, index = 0 }) {
  const core = externalId
    ? `${target}|${externalId}`
    : `${target}|${date}|${Number(amount).toFixed(2)}|${normalize(description).slice(0, 40)}|${index}`
  let hash = 5381
  for (let i = 0; i < core.length; i += 1) hash = ((hash << 5) + hash + core.charCodeAt(i)) >>> 0
  return `${hash.toString(36)}-${core.length.toString(36)}`
}

/** Marca duplicatas dentro do próprio arquivo (mesma data/valor/descrição). */
export function withOccurrenceIndex(rows) {
  const seen = new Map()
  return rows.map((r) => {
    const key = `${r.date}|${r.amount}|${normalize(r.description)}`
    const idx = seen.get(key) || 0
    seen.set(key, idx + 1)
    return { ...r, occurrence: idx }
  })
}

/* ---------- rules ---------- */
/** Palavras-chave iniciais, usadas quando ainda não há regras próprias. */
const DEFAULT_HINTS = [
  { pattern: 'SALARIO', category: 'Salário', kind: 'income' },
  { pattern: 'PRO LABORE', category: 'Pró-labore', kind: 'income' },
  { pattern: 'RENDIMENTO', category: 'Rendimentos', kind: 'income' },
  { pattern: 'ALUGUEL', category: 'Aluguéis recebidos', kind: 'income' },
  { pattern: 'RESTITUICAO', category: 'Reembolsos', kind: 'income' },

  { pattern: 'CONDOMINIO', category: 'Condomínio' },
  { pattern: 'IPTU', category: 'IPTU' },
  { pattern: 'ENEL', category: 'Energia' },
  { pattern: 'CEMIG', category: 'Energia' },
  { pattern: 'COPEL', category: 'Energia' },
  { pattern: 'LIGHT', category: 'Energia' },
  { pattern: 'ENERGIA', category: 'Energia' },
  { pattern: 'SANEPAR', category: 'Água' },
  { pattern: 'SABESP', category: 'Água' },
  { pattern: 'COPASA', category: 'Água' },
  { pattern: 'VIVO', category: 'Internet e telefonia' },
  { pattern: 'CLARO', category: 'Internet e telefonia' },
  { pattern: 'TIM ', category: 'Internet e telefonia' },
  { pattern: 'OI FIBRA', category: 'Internet e telefonia' },

  { pattern: 'NETFLIX', category: 'Assinaturas' },
  { pattern: 'SPOTIFY', category: 'Assinaturas' },
  { pattern: 'AMAZON PRIME', category: 'Assinaturas' },
  { pattern: 'DISNEY', category: 'Assinaturas' },
  { pattern: 'GOOGLE', category: 'Assinaturas' },
  { pattern: 'APPLE.COM', category: 'Assinaturas' },
  { pattern: 'MICROSOFT', category: 'Assinaturas' },

  { pattern: 'SUPERMERCADO', category: 'Mercado' },
  { pattern: 'MERCADO', category: 'Mercado' },
  { pattern: 'ATACAD', category: 'Mercado' },
  { pattern: 'CARREFOUR', category: 'Mercado' },
  { pattern: 'ASSAI', category: 'Mercado' },
  { pattern: 'PAO DE ACUCAR', category: 'Mercado' },
  { pattern: 'HORTIFRUTI', category: 'Mercado' },

  { pattern: 'IFOOD', category: 'Alimentação fora' },
  { pattern: 'RAPPI', category: 'Alimentação fora' },
  { pattern: 'RESTAURANTE', category: 'Alimentação fora' },
  { pattern: 'PADARIA', category: 'Alimentação fora' },
  { pattern: 'LANCHONETE', category: 'Alimentação fora' },
  { pattern: 'CAFE', category: 'Alimentação fora' },

  { pattern: 'UBER', category: 'Transporte' },
  { pattern: '99APP', category: 'Transporte' },
  { pattern: 'ESTACIONAMENTO', category: 'Transporte' },
  { pattern: 'PEDAGIO', category: 'Transporte' },
  { pattern: 'POSTO', category: 'Combustível' },
  { pattern: 'IPIRANGA', category: 'Combustível' },
  { pattern: 'SHELL', category: 'Combustível' },
  { pattern: 'PETROBRAS', category: 'Combustível' },

  { pattern: 'DROGA', category: 'Farmácia' },
  { pattern: 'FARMACIA', category: 'Farmácia' },
  { pattern: 'PACHECO', category: 'Farmácia' },
  { pattern: 'RAIA', category: 'Farmácia' },
  { pattern: 'UNIMED', category: 'Plano de saúde' },
  { pattern: 'AMIL', category: 'Plano de saúde' },
  { pattern: 'BRADESCO SAUDE', category: 'Plano de saúde' },
  { pattern: 'HOSPITAL', category: 'Saúde' },
  { pattern: 'CLINICA', category: 'Saúde' },
  { pattern: 'LABORATORIO', category: 'Saúde' },
  { pattern: 'ODONTO', category: 'Saúde' },

  { pattern: 'ESCOLA', category: 'Educação' },
  { pattern: 'FACULDADE', category: 'Educação' },
  { pattern: 'CURSO', category: 'Educação' },

  { pattern: 'SEGURO', category: 'Seguros' },
  { pattern: 'PORTO SEGURO', category: 'Seguros' },

  { pattern: 'IOF', category: 'Juros e tarifas' },
  { pattern: 'TARIFA', category: 'Juros e tarifas' },
  { pattern: 'JUROS', category: 'Juros e tarifas' },
  { pattern: 'ANUIDADE', category: 'Juros e tarifas' },
  { pattern: 'DARF', category: 'Impostos e taxas' },
  { pattern: 'IRPF', category: 'Impostos e taxas' },
  { pattern: 'FINANCIAMENTO', category: 'Financiamentos' },
  { pattern: 'PRESTACAO', category: 'Financiamentos' },

  { pattern: 'PAGAMENTO DE FATURA', category: null, kind: 'card_payment' },
  { pattern: 'PGTO FATURA', category: null, kind: 'card_payment' },
  { pattern: 'APLICACAO', category: null, kind: 'investment' },
  { pattern: 'CDB', category: null, kind: 'investment' },
  { pattern: 'TESOURO DIRETO', category: null, kind: 'investment' }
]

function matches(rule, text) {
  const pattern = normalize(rule.pattern)
  if (!pattern) return false
  if (rule.match_type === 'starts') return text.startsWith(pattern)
  if (rule.match_type === 'regex') {
    try { return new RegExp(rule.pattern, 'i').test(text) } catch { return false }
  }
  return text.includes(pattern)
}

/**
 * Decide categoria e tipo de um lançamento.
 * Regras do usuário têm prioridade sobre as palavras-chave padrão.
 */
export function categorize(row, { rules = [], categories = [] } = {}) {
  const text = normalize(row.description)
  const negative = Number(row.amount) < 0

  const userRules = rules
    .filter((r) => r.active !== false)
    .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))

  for (const rule of userRules) {
    if (matches(rule, text)) {
      return {
        category_id: rule.category_id || null,
        kind: rule.set_kind || (negative ? 'expense' : 'income'),
        description: rule.rename_to || row.description,
        matchedRule: rule.id
      }
    }
  }

  for (const hint of DEFAULT_HINTS) {
    if (!text.includes(normalize(hint.pattern))) continue
    if (hint.kind === 'income' && negative) continue
    const category = hint.category
      ? categories.find((c) => c.name === hint.category)
      : null
    return {
      category_id: category?.id || null,
      kind: hint.kind || (negative ? 'expense' : 'income'),
      description: row.description,
      matchedRule: null,
      suggested: true
    }
  }

  return {
    category_id: null,
    kind: negative ? 'expense' : 'income',
    description: row.description,
    matchedRule: null
  }
}

/** Sugere uma regra a partir de uma descrição real de extrato. */
export function suggestPattern(description) {
  const text = normalize(description)
  const stop = /^(COMPRA|PAGAMENTO|PIX|TED|DOC|DEBITO|CREDITO|TRANSFERENCIA|CARTAO|REC|ENVIADO|RECEBIDO)$/
  const words = text.split(/[\s*\-/]+/).filter((w) => w.length > 3 && !stop.test(w) && !/^\d+$/.test(w))
  return words.slice(0, 2).join(' ') || text.slice(0, 20)
}

export const defaultHints = DEFAULT_HINTS

/* ---------- db ---------- */
/*
 * Toda escrita carimba user_id = auth.uid(). O RLS do Postgres já bloqueia
 * qualquer tentativa de gravar em nome de outro usuário; isto aqui só evita
 * um round-trip com erro.
 */

export const TABLES = {
  accounts: 'bank_accounts',
  cards: 'credit_cards',
  categories: 'categories',
  objectives: 'objectives',
  investments: 'investments',
  allocations: 'investment_allocations',
  interest: 'investment_interest',
  transactions: 'transactions',
  properties: 'properties',
  propertyObligations: 'property_obligations',
  liabilities: 'liabilities',
  subscriptions: 'subscriptions',
  healthCosts: 'health_costs',
  capitalCosts: 'capital_costs',
  reconciliations: 'reconciliations',
  importBatches: 'import_batches',
  importRules: 'import_rules',
  snapshots: 'net_worth_snapshots'
}

/*
 * Campos calculados pelas telas (saldo do razão, progresso de objetivo…).
 * Eles não existem no banco, então precisam sair antes de qualquer gravação.
 */
const COMPUTED = new Set([
  'ledger', 'informed', 'difference', 'available', 'usage',
  'current', 'contributed', 'target', 'missing', 'monthsLeft',
  'monthlyRate', 'neededMonthly', 'progress', 'investments', 'month'
])

const stripped = (row) => {
  const out = {}
  Object.entries(row).forEach(([k, v]) => {
    if (k.startsWith('__') || COMPUTED.has(k)) return
    out[k] = v === '' ? null : v
  })
  return out
}

export async function fetchTable(table, { order, ascending = true, limit } = {}) {
  let q = supabase.from(table).select('*')
  if (order) q = q.order(order, { ascending, nullsFirst: false })
  if (limit) q = q.limit(limit)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function insertRow(table, row, uid) {
  const { data, error } = await supabase
    .from(table)
    .insert({ ...stripped(row), user_id: uid })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function insertMany(table, rows, uid) {
  if (!rows.length) return []
  const payload = rows.map((r) => ({ ...stripped(r), user_id: uid }))
  const { data, error } = await supabase.from(table).insert(payload).select()
  if (error) throw error
  return data || []
}

export async function updateRow(table, id, patch) {
  const { data, error } = await supabase
    .from(table)
    .update(stripped(patch))
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
  return id
}

export async function saveRow(table, row, uid) {
  return row.id ? updateRow(table, row.id, row) : insertRow(table, row, uid)
}

export async function fetchSettings(uid) {
  const { data, error } = await supabase.from('settings').select('*').eq('user_id', uid).maybeSingle()
  if (error) throw error
  return data
}

export async function saveSettings(uid, patch) {
  const { data, error } = await supabase
    .from('settings')
    .upsert({ user_id: uid, ...stripped(patch), updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Cria categorias padrão e a linha de settings, caso ainda não existam. */
export async function ensureDefaults() {
  const { error } = await supabase.rpc('ensure_defaults')
  // Se a migração 0002 ainda não foi rodada, o app continua funcionando
  // com o que existe; o erro real aparece no carregamento das tabelas.
  if (error && !/does not exist|schema cache|Could not find/i.test(error.message || '')) {
    throw error
  }
}

export function friendlyError(error) {
  if (!error) return ''
  const msg = String(error.message || error)
  if (/duplicate key value/i.test(msg)) return 'Esse registro já existe.'
  if (/violates row-level security/i.test(msg)) return 'Sem permissão para gravar este registro.'
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/User already registered/i.test(msg)) return 'Já existe uma conta com este e-mail.'
  if (/Email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar.'
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Sem conexão com o servidor. Tente de novo.'
  if (/relation .* does not exist/i.test(msg)) return 'Tabela ausente no banco. Rode a migração 0002 no Supabase.'
  if (/column .* does not exist/i.test(msg)) return 'Coluna ausente no banco. Rode a migração 0002 no Supabase.'
  if (/permission denied|not authorized/i.test(msg)) return 'Sem permissão para esta operação.'
  // Mensagem crua do Postgres pode revelar estrutura do banco. Vai só para o console.
  console.warn('Erro não mapeado:', msg)
  return 'Não foi possível concluir. Tente de novo em instantes.'
}
