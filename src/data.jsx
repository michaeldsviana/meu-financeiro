/* =====================================================================
   data.jsx — sessão do usuário e carregamento global dos dados.
   ===================================================================== */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { SETTLED, TABLES, accountLedgerBalance, accountsOverview, addMonths, applyFilters, baseline, cardInvoice, cardLedgerDebt, cardsOverview, cashProjection, categorize, cleanNumberInput, commitmentsForMonth, currentMonth, dayLabel, decimal, defaultHints, deleteRow, dueDateInMonth, ensureDefaults, fetchSettings, fetchTable, fingerprint, flowForMonth, flowSeries, friendlyError, fullDate, groupByCategory, initials, insertMany, insertRow, iso, money, monthEnd, monthKey, monthLabel, monthRange, monthStart, monthlyRateOf, monthsBetween, n, netWorth, nextOccurrence, normalize, objectivesOverview, occurrencesIn, parseCsv, parseMoney, parseOfx, parseStatement, parseStatementDate, pendingInterest, percent, projectInvestments, reservePlan, saveRow, saveSettings, suggestPattern, sum, supabase, toDate, today, totalCardDebt, totalCash, totalInvested, txMonth, updateRow, withOccurrenceIndex } from './lib'

/* ---------- AuthProvider ---------- */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })
    return () => {
      alive = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(() => ({
    session,
    loading,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUp: (email, password) => supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + window.location.pathname }
    }),
    resetPassword: (email) => supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    }),
    updatePassword: (password) => supabase.auth.updateUser({ password }),
    signOut: () => supabase.auth.signOut()
  }), [session, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return ctx
}

/* ---------- DataProvider ---------- */
const DataContext = createContext(null)

const EMPTY = Object.keys(TABLES).reduce((acc, k) => ({ ...acc, [k]: [] }), {})

const LOAD_ORDER = {
  accounts: { order: 'name' },
  cards: { order: 'name' },
  categories: { order: 'name' },
  objectives: { order: 'priority' },
  investments: { order: 'name' },
  allocations: { order: 'allocation_date', ascending: false },
  interest: { order: 'reference_month', ascending: false },
  transactions: { order: 'tx_date', ascending: false, limit: 4000 },
  properties: { order: 'name' },
  propertyObligations: { order: 'next_due_date' },
  liabilities: { order: 'name' },
  subscriptions: { order: 'name' },
  healthCosts: { order: 'reference_month', ascending: false },
  capitalCosts: { order: 'reference_month', ascending: false },
  reconciliations: { order: 'reference_date', ascending: false, limit: 200 },
  importBatches: { order: 'created_at', ascending: false, limit: 50 },
  importRules: { order: 'priority' },
  snapshots: { order: 'reference_month', ascending: false, limit: 60 }
}

export function DataProvider({ children }) {
  const { session } = useAuth()
  const uid = session?.user?.id
  const [data, setData] = useState(EMPTY)
  const [settings, setSettings] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [month, setMonth] = useState(currentMonth())
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const notify = useCallback((message, tone = 'ok') => {
    setToast({ message, tone })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }, [])

  const load = useCallback(async () => {
    if (!uid) return
    setStatus('loading')
    setError('')
    try {
      await ensureDefaults()
      const keys = Object.keys(TABLES)
      const results = await Promise.all(
        keys.map((k) => fetchTable(TABLES[k], LOAD_ORDER[k] || {}))
      )
      const next = {}
      keys.forEach((k, i) => { next[k] = results[i] })
      setData(next)
      setSettings(await fetchSettings(uid))
      setStatus('ready')
    } catch (e) {
      setError(friendlyError(e))
      setStatus('error')
    }
  }, [uid])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (key, row, { silent = false } = {}) => {
    const table = TABLES[key]
    if (!table) throw new Error(`Tabela desconhecida: ${key}`)
    try {
      const saved = await saveRow(table, row, uid)
      setData((prev) => {
        const list = prev[key] || []
        const exists = list.some((x) => x.id === saved.id)
        return {
          ...prev,
          [key]: exists ? list.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...list]
        }
      })
      if (!silent) notify(row.id ? 'Alterações salvas.' : 'Registro criado.')
      return saved
    } catch (e) {
      notify(friendlyError(e), 'error')
      throw e
    }
  }, [uid, notify])

  const saveMany = useCallback(async (key, rows) => {
    const table = TABLES[key]
    if (!rows.length) return []
    try {
      const saved = await insertMany(table, rows, uid)
      setData((prev) => ({ ...prev, [key]: [...saved, ...(prev[key] || [])] }))
      return saved
    } catch (e) {
      notify(friendlyError(e), 'error')
      throw e
    }
  }, [uid, notify])

  const remove = useCallback(async (key, id) => {
    const table = TABLES[key]
    try {
      await deleteRow(table, id)
      setData((prev) => ({ ...prev, [key]: (prev[key] || []).filter((x) => x.id !== id) }))
      notify('Registro excluído.')
    } catch (e) {
      notify(friendlyError(e), 'error')
      throw e
    }
  }, [notify])

  const updateSettings = useCallback(async (patch) => {
    try {
      const saved = await saveSettings(uid, patch)
      setSettings(saved)
      return saved
    } catch (e) {
      notify(friendlyError(e), 'error')
      throw e
    }
  }, [uid, notify])

  const value = useMemo(() => ({
    ...data,
    settings,
    today: today(),
    status,
    error,
    month,
    setMonth,
    reload: load,
    save,
    saveMany,
    remove,
    updateSettings,
    notify,
    toast,
    hideValues: !!settings?.hide_values
  }), [data, settings, status, error, month, load, save, saveMany, remove, updateSettings, notify, toast])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData precisa estar dentro de DataProvider')
  return ctx
}

/** Atalhos de consulta usados por várias telas. */
export function useLookup() {
  const { accounts, cards, categories, objectives, investments, properties } = useData()
  return useMemo(() => ({
    accountName: (id) => accounts.find((a) => a.id === id)?.name || '—',
    cardName: (id) => cards.find((c) => c.id === id)?.name || '—',
    categoryName: (id) => categories.find((c) => c.id === id)?.name || 'Sem categoria',
    objectiveName: (id) => objectives.find((o) => o.id === id)?.name || '—',
    investmentName: (id) => investments.find((i) => i.id === id)?.name || '—',
    propertyName: (id) => properties.find((p) => p.id === id)?.name || '—'
  }), [accounts, cards, categories, objectives, investments, properties])
}
