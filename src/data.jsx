/* =====================================================================
   data.jsx — sessão do usuário e carregamento global dos dados.
   ===================================================================== */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {
  TABLES,
  currentMonth,
  deleteRow,
  ensureDefaults,
  fetchSettings,
  fetchTable,
  friendlyError,
  insertMany,
  saveRow,
  saveSettings,
  supabase,
  today
} from './lib'

/* ---------- AuthProvider ---------- */

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    /*
     * Recupera a sessão existente.
     *
     * O aplicativo não deve renderizar a área financeira antes
     * desta operação terminar.
     */
    const restoreSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (!alive) return

        if (error) {
          console.error(
            '[Meu Financeiro] Erro ao recuperar sessão:',
            error
          )

          setSession(null)
        } else {
          setSession(data?.session ?? null)
        }
      } catch (error) {
        if (!alive) return

        console.error(
          '[Meu Financeiro] Falha ao recuperar sessão:',
          error
        )

        setSession(null)
      } finally {
        if (alive) {
          setLoading(false)
        }
      }
    }

    restoreSession()

    /*
     * Listener permanente da sessão.
     *
     * Importante: não fazemos chamadas ao banco aqui.
     * O listener apenas atualiza o estado da autenticação.
     */
    const {
      data: authData
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!alive) return

        setSession(nextSession ?? null)
        setLoading(false)
      }
    )

    return () => {
      alive = false
      authData?.subscription?.unsubscribe()
    }
  }, [])

  const signIn = useCallback(
    async (email, password) => {
      return supabase.auth.signInWithPassword({
        email: String(email || '').trim(),
        password
      })
    },
    []
  )

  const signUp = useCallback(
    async (email, password) => {
      const redirectUrl =
        `${window.location.origin}` +
        `${window.location.pathname}` +
        '#/painel'

      return supabase.auth.signUp({
        email: String(email || '').trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      })
    },
    []
  )

  const resetPassword = useCallback(
    async (email) => {
      const redirectUrl =
        `${window.location.origin}` +
        `${window.location.pathname}` +
        '#/painel'

      return supabase.auth.resetPasswordForEmail(
        String(email || '').trim(),
        {
          redirectTo: redirectUrl
        }
      )
    },
    []
  )

  const updatePassword = useCallback(
    async (password) => {
      return supabase.auth.updateUser({
        password
      })
    },
    []
  )

  const signOut = useCallback(
    async () => {
      const result = await supabase.auth.signOut()

      /*
       * Atualização imediata do estado.
       * O listener também fará isso, mas manter o estado local
       * consistente evita qualquer frame intermediário.
       */
      setSession(null)

      return result
    },
    []
  )

  const value = useMemo(
    () => ({
      session,
      loading,
      signIn,
      signUp,
      resetPassword,
      updatePassword,
      signOut
    }),
    [
      session,
      loading,
      signIn,
      signUp,
      resetPassword,
      updatePassword,
      signOut
    ]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error(
      'useAuth precisa estar dentro de AuthProvider'
    )
  }

  return ctx
}

/* ---------- DataProvider ---------- */

const DataContext = createContext(null)

const EMPTY = Object.keys(TABLES).reduce(
  (acc, key) => {
    acc[key] = []
    return acc
  },
  {}
)

/*
 * Ordem de carregamento.
 *
 * O limite de transações evita que um banco muito grande
 * bloqueie a inicialização do aplicativo.
 */
const LOAD_ORDER = {
  accounts: {
    order: 'name'
  },

  cards: {
    order: 'name'
  },

  categories: {
    order: 'name'
  },

  objectives: {
    order: 'priority'
  },

  investments: {
    order: 'name'
  },

  allocations: {
    order: 'allocation_date',
    ascending: false
  },

  interest: {
    order: 'reference_month',
    ascending: false
  },

  transactions: {
    order: 'tx_date',
    ascending: false,
    limit: 4000
  },

  properties: {
    order: 'name'
  },

  propertyObligations: {
    order: 'next_due_date'
  },

  liabilities: {
    order: 'name'
  },

  subscriptions: {
    order: 'name'
  },

  healthCosts: {
    order: 'reference_month',
    ascending: false
  },

  capitalCosts: {
    order: 'reference_month',
    ascending: false
  },

  reconciliations: {
    order: 'reference_date',
    ascending: false,
    limit: 200
  },

  importBatches: {
    order: 'created_at',
    ascending: false,
    limit: 50
  },

  importRules: {
    order: 'priority'
  },

  snapshots: {
    order: 'reference_month',
    ascending: false,
    limit: 60
  }
}

/*
 * Carrega cada tabela independentemente.
 *
 * Antes:
 *
 *   Promise.all(...)
 *
 * Isso fazia UMA tabela quebrada derrubar TODA a aplicação.
 *
 * Agora:
 *
 *   Promise.allSettled(...)
 *
 * Assim o painel abre mesmo que exista uma tabela com problema.
 */
async function loadTables() {
  const keys = Object.keys(TABLES)

  const settled = await Promise.allSettled(
    keys.map((key) =>
      fetchTable(
        TABLES[key],
        LOAD_ORDER[key] || {}
      )
    )
  )

  const next = {}
  const failures = []

  keys.forEach((key, index) => {
    const result = settled[index]

    if (result.status === 'fulfilled') {
      next[key] = result.value || []
      return
    }

    /*
     * Uma tabela problemática não derruba o restante.
     */
    next[key] = []

    failures.push({
      key,
      table: TABLES[key],
      error: result.reason
    })

    console.error(
      `[Meu Financeiro] Falha ao carregar ${TABLES[key]}:`,
      result.reason
    )
  })

  return {
    data: next,
    failures
  }
}

function formatLoadFailures(failures) {
  if (!failures?.length) return ''

  const names = failures
    .map((item) => item.table)
    .filter(Boolean)

  if (!names.length) {
    return 'Alguns dados não puderam ser carregados.'
  }

  return (
    `Alguns dados não puderam ser carregados: ` +
    `${names.join(', ')}.`
  )
}

export function DataProvider({ children }) {
  const { session } = useAuth()

  const uid = session?.user?.id

  const [data, setData] = useState(EMPTY)
  const [settings, setSettings] = useState(null)

  /*
   * loading = carregando banco
   * ready   = aplicação utilizável
   * error   = falha crítica
   */
  const [status, setStatus] = useState('loading')

  const [error, setError] = useState('')

  const [month, setMonth] = useState(
    currentMonth()
  )

  const [toast, setToast] = useState(null)

  const toastTimer = useRef(null)

  /*
   * Evita atualização de estado depois que o componente
   * for desmontado durante uma requisição.
   */
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  const notify = useCallback(
    (message, tone = 'ok') => {
      if (!mountedRef.current) return

      setToast({
        message,
        tone
      })

      if (toastTimer.current) {
        clearTimeout(toastTimer.current)
      }

      toastTimer.current = setTimeout(() => {
        if (mountedRef.current) {
          setToast(null)
        }
      }, 4000)
    },
    []
  )

  /*
   * Limpa dados antigos imediatamente quando o usuário muda.
   *
   * Isso impede que dados de uma sessão anterior apareçam
   * momentaneamente para outro usuário.
   */
  useEffect(() => {
    if (!uid) {
      setData(EMPTY)
      setSettings(null)
      setStatus('loading')
      setError('')
    }
  }, [uid])

  const load = useCallback(
    async () => {
      if (!uid) {
        if (mountedRef.current) {
          setData(EMPTY)
          setSettings(null)
          setStatus('loading')
          setError('')
        }

        return
      }

      if (mountedRef.current) {
        setStatus('loading')
        setError('')
      }

      try {
        /*
         * ensure_defaults é auxiliar.
         *
         * Se a RPC não existir, não devemos impedir o login.
         * O próprio lib.js já trata ausência da RPC.
         */
        try {
          await ensureDefaults()
        } catch (defaultsError) {
          console.warn(
            '[Meu Financeiro] ensure_defaults falhou:',
            defaultsError
          )
        }

        /*
         * Carrega todas as tabelas sem permitir que uma falha
         * interrompa as demais.
         */
        const result = await loadTables()

        /*
         * Settings também é independente.
         *
         * Se settings estiver ausente ou com problema, usamos
         * configuração vazia e permitimos que o aplicativo abra.
         */
        let loadedSettings = null

        try {
          loadedSettings = await fetchSettings(uid)
        } catch (settingsError) {
          console.warn(
            '[Meu Financeiro] Falha ao carregar settings:',
            settingsError
          )
        }

        if (!mountedRef.current) return

        setData(result.data)
        setSettings(loadedSettings)

        /*
         * Mesmo existindo falhas parciais, a aplicação é utilizável.
         *
         * Isso é a correção principal do travamento pós-login.
         */
        setStatus('ready')

        if (result.failures.length) {
          setError(
            formatLoadFailures(result.failures)
          )
        } else {
          setError('')
        }
      } catch (e) {
        /*
         * Só chega aqui em uma falha realmente crítica,
         * como erro estrutural inesperado.
         */
        console.error(
          '[Meu Financeiro] Falha crítica no carregamento:',
          e
        )

        if (!mountedRef.current) return

        setError(friendlyError(e))
        setStatus('error')
      }
    },
    [uid]
  )

  useEffect(() => {
    load()
  }, [load])

  /*
   * Salvar um registro.
   */
  const save = useCallback(
    async (
      key,
      row,
      { silent = false } = {}
    ) => {
      const table = TABLES[key]

      if (!table) {
        throw new Error(
          `Tabela desconhecida: ${key}`
        )
      }

      if (!uid) {
        throw new Error(
          'Sessão expirada. Entre novamente.'
        )
      }

      try {
        const saved = await saveRow(
          table,
          row,
          uid
        )

        if (mountedRef.current) {
          setData((prev) => {
            const list = prev[key] || []

            const exists = list.some(
              (item) => item.id === saved.id
            )

            return {
              ...prev,

              [key]: exists
                ? list.map((item) =>
                    item.id === saved.id
                      ? saved
                      : item
                  )
                : [
                    saved,
                    ...list
                  ]
            }
          })
        }

        if (!silent) {
          notify(
            row.id
              ? 'Alterações salvas.'
              : 'Registro criado.'
          )
        }

        return saved
      } catch (e) {
        notify(
          friendlyError(e),
          'error'
        )

        throw e
      }
    },
    [uid, notify]
  )

  /*
   * Salvar vários registros.
   */
  const saveMany = useCallback(
    async (key, rows) => {
      const table = TABLES[key]

      if (!table) {
        throw new Error(
          `Tabela desconhecida: ${key}`
        )
      }

      if (!uid) {
        throw new Error(
          'Sessão expirada. Entre novamente.'
        )
      }

      if (!Array.isArray(rows) || !rows.length) {
        return []
      }

      try {
        const saved = await insertMany(
          table,
          rows,
          uid
        )

        if (mountedRef.current) {
          setData((prev) => ({
            ...prev,

            [key]: [
              ...saved,
              ...(prev[key] || [])
            ]
          }))
        }

        notify(
          `${saved.length} registro(s) importado(s).`
        )

        return saved
      } catch (e) {
        notify(
          friendlyError(e),
          'error'
        )

        throw e
      }
    },
    [uid, notify]
  )

  /*
   * Excluir registro.
   */
  const remove = useCallback(
    async (key, id) => {
      const table = TABLES[key]

      if (!table) {
        throw new Error(
          `Tabela desconhecida: ${key}`
        )
      }

      if (!uid) {
        throw new Error(
          'Sessão expirada. Entre novamente.'
        )
      }

      try {
        await deleteRow(
          table,
          id
        )

        if (mountedRef.current) {
          setData((prev) => ({
            ...prev,

            [key]: (
              prev[key] || []
            ).filter(
              (item) => item.id !== id
            )
          }))
        }

        notify(
          'Registro excluído.'
        )
      } catch (e) {
        notify(
          friendlyError(e),
          'error'
        )

        throw e
      }
    },
    [uid, notify]
  )

  /*
   * Atualizar configurações.
   *
   * Se settings ainda não existir, saveSettings usa upsert.
   */
  const updateSettings = useCallback(
    async (patch) => {
      if (!uid) {
        throw new Error(
          'Sessão expirada. Entre novamente.'
        )
      }

      try {
        const saved = await saveSettings(
          uid,
          patch
        )

        if (mountedRef.current) {
          setSettings(saved)
        }

        return saved
      } catch (e) {
        notify(
          friendlyError(e),
          'error'
        )

        throw e
      }
    },
    [uid, notify]
  )

  const value = useMemo(
    () => ({
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

      hideValues:
        !!settings?.hide_values
    }),
    [
      data,
      settings,
      status,
      error,
      month,
      load,
      save,
      saveMany,
      remove,
      updateSettings,
      notify,
      toast
    ]
  )

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => {
  const ctx = useContext(DataContext)

  if (!ctx) {
    throw new Error(
      'useData precisa estar dentro de DataProvider'
    )
  }

  return ctx
}

/* ---------- Lookup ---------- */

export function useLookup() {
  const {
    accounts,
    cards,
    categories,
    objectives,
    investments,
    properties
  } = useData()

  return useMemo(
    () => ({
      accountName: (id) =>
        accounts.find(
          (a) => a.id === id
        )?.name || '—',

      cardName: (id) =>
        cards.find(
          (c) => c.id === id
        )?.name || '—',

      categoryName: (id) =>
        categories.find(
          (c) => c.id === id
        )?.name || 'Sem categoria',

      objectiveName: (id) =>
        objectives.find(
          (o) => o.id === id
        )?.name || '—',

      investmentName: (id) =>
        investments.find(
          (i) => i.id === id
        )?.name || '—',

      propertyName: (id) =>
        properties.find(
          (p) => p.id === id
        )?.name || '—'
    }),
    [
      accounts,
      cards,
      categories,
      objectives,
      investments,
      properties
    ]
  )
}
