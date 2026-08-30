import React, { StrictMode, createContext, useContext, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './lib'
import { DataProvider } from './data'
import { Layout, Loading, Toast } from './ui'
import {
  DashboardPage,
  FlowPage,
  TransactionsPage,
  AccountsPage,
  CardsPage,
  InvestmentsPage,
  PropertiesPage,
  SubscriptionsPage,
  HealthPage,
  CapitalPage,
  ImportPage,
  SettingsPage
} from './pages'
import './styles.css'

const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      try {
        const {
          data: { session: currentSession },
          error
        } = await supabase.auth.getSession()

        if (error) throw error

        if (mounted) {
          setSession(currentSession)
          setLoading(false)
        }
      } catch (error) {
        console.error('Erro ao recuperar sessão:', error)

        if (mounted) {
          setAuthError(
            error?.message ||
            'Não foi possível recuperar sua sessão.'
          )
          setLoading(false)
        }
      }
    }

    loadSession()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        if (!mounted) return

        setSession(currentSession)
        setAuthError('')
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      session,
      loading,
      authError,
      signOut: async () => {
        const { error } = await supabase.auth.signOut()

        if (error) {
          console.error('Erro ao sair:', error)
          throw error
        }

        setSession(null)
      }
    }),
    [session, loading, authError]
  )

  if (loading) {
    return <Loading label="Verificando sessão" />
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

function LoginPage() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (session) {
      navigate('/painel', { replace: true })
    }
  }, [session, navigate])

  async function submit(event) {
    event.preventDefault()

    setError('')
    setMessage('')

    if (!email.trim()) {
      setError('Informe seu e-mail.')
      return
    }

    if (!password) {
      setError('Informe sua senha.')
      return
    }

    setBusy(true)

    try {
      if (mode === 'login') {
        const { data, error: loginError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password
          })

        if (loginError) throw loginError

        if (!data?.session) {
          throw new Error(
            'Login realizado, mas nenhuma sessão foi criada.'
          )
        }

        setMessage('Login realizado. Carregando seu financeiro...')
      } else {
        const { data, error: signUpError } =
          await supabase.auth.signUp({
            email: email.trim(),
            password
          })

        if (signUpError) throw signUpError

        if (data?.session) {
          setMessage('Conta criada. Carregando seu financeiro...')
        } else {
          setMessage(
            'Conta criada. Verifique seu e-mail para confirmar o cadastro.'
          )
        }
      }
    } catch (error) {
      console.error('Erro de autenticação:', error)

      setError(
        error?.message ||
        'Não foi possível concluir a autenticação.'
      )
    } finally {
      setBusy(false)
    }
  }

  async function resetPassword() {
    setError('')
    setMessage('')

    if (!email.trim()) {
      setError('Informe seu e-mail primeiro.')
      return
    }

    setBusy(true)

    try {
      const redirectTo = `${window.location.origin}${window.location.pathname}`

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo
        }
      )

      if (error) throw error

      setMessage(
        'Enviamos as instruções de recuperação para seu e-mail.'
      )
    } catch (error) {
      console.error('Erro ao recuperar senha:', error)

      setError(
        error?.message ||
        'Não foi possível enviar a recuperação de senha.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="mark">MF</span>

          <div>
            <b>Meu Financeiro</b>
            <small>Controle financeiro pessoal</small>
          </div>
        </div>

        <div className="auth-head">
          <h1>
            {mode === 'login'
              ? 'Bem-vindo de volta'
              : 'Criar sua conta'}
          </h1>

          <p>
            {mode === 'login'
              ? 'Entre para acessar seu painel financeiro.'
              : 'Crie sua conta para começar.'}
          </p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label className="field">
            <span className="field-label">E-mail</span>

            <input
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@email.com"
              required
            />
          </label>

          <label className="field">
            <span className="field-label">Senha</span>

            <input
              className="input"
              type="password"
              autoComplete={
                mode === 'login'
                  ? 'current-password'
                  : 'new-password'
              }
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Sua senha"
              required
            />
          </label>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          {message && (
            <div className="form-success">
              {message}
            </div>
          )}

          <button
            className="btn btn-solid btn-md"
            type="submit"
            disabled={busy}
          >
            {busy
              ? 'Aguarde...'
              : mode === 'login'
                ? 'Entrar'
                : 'Criar conta'}
          </button>
        </form>

        {mode === 'login' && (
          <button
            className="auth-link"
            type="button"
            onClick={resetPassword}
            disabled={busy}
          >
            Esqueci minha senha
          </button>
        )}

        <div className="auth-switch">
          <span>
            {mode === 'login'
              ? 'Ainda não possui uma conta?'
              : 'Já possui uma conta?'}
          </span>

          <button
            type="button"
            onClick={() => {
              setMode(
                mode === 'login'
                  ? 'signup'
                  : 'login'
              )
              setError('')
              setMessage('')
            }}
          >
            {mode === 'login'
              ? 'Criar conta'
              : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <Loading label="Carregando" />
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  return children
}

function AppShell() {
  const { session } = useAuth()

  if (!session) {
    return <LoginPage />
  }

  return (
    <DataProvider>
      <AppRoutes />
    </DataProvider>
  )
}

function AppRoutes() {
  const navigate = useNavigate()
  const location = useLocation()

  const route =
    location.pathname
      .replace(/^\/+/, '')
      .split('/')[0] ||
    'painel'

  const validRoutes = [
    'painel',
    'fluxo',
    'lancamentos',
    'contas',
    'cartoes',
    'investimentos',
    'imoveis',
    'assinaturas',
    'saude',
    'capital',
    'importar',
    'ajustes'
  ]

  const currentRoute = validRoutes.includes(route)
    ? route
    : 'painel'

  const [newEntryOpen, setNewEntryOpen] = useState(false)

  function navigateTo(path) {
    navigate(`/${path}`)
  }

  return (
    <Layout
      route={currentRoute}
      navigate={navigateTo}
      onNewEntry={() => setNewEntryOpen(true)}
    >
      {currentRoute === 'painel' && <DashboardPage />}
      {currentRoute === 'fluxo' && <FlowPage />}
      {currentRoute === 'lancamentos' && <TransactionsPage />}
      {currentRoute === 'contas' && <AccountsPage />}
      {currentRoute === 'cartoes' && <CardsPage />}
      {currentRoute === 'investimentos' && <InvestmentsPage />}
      {currentRoute === 'imoveis' && <PropertiesPage />}
      {currentRoute === 'assinaturas' && <SubscriptionsPage />}
      {currentRoute === 'saude' && <HealthPage />}
      {currentRoute === 'capital' && <CapitalPage />}
      {currentRoute === 'importar' && <ImportPage />}
      {currentRoute === 'ajustes' && <SettingsPage />}

      {/* O formulário global de lançamento é aberto
          pelo botão + da interface. */}
      <GlobalTransactionModal
        open={newEntryOpen}
        onClose={() => setNewEntryOpen(false)}
      />
    </Layout>
  )
}

function GlobalTransactionModal({ open, onClose }) {
  /*
   * Importação dinâmica evita criar uma dependência circular
   * entre main.jsx e ui.jsx durante a inicialização.
   */
  const [Component, setComponent] = useState(null)

  useEffect(() => {
    let active = true

    if (!open) {
      setComponent(null)
      return undefined
    }

    import('./ui').then((module) => {
      if (active) {
        setComponent(() => module.TransactionSheet)
      }
    })

    return () => {
      active = false
    }
  }, [open])

  if (!open || !Component) {
    return null
  }

  return (
    <Component
      open={open}
      record={null}
      onClose={onClose}
    />
  )
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
