/* =====================================================================
   App.jsx — aplicação principal, autenticação e roteamento
   ===================================================================== */

import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate
} from 'react-router-dom'

import {
  Loader2,
  LockKeyhole,
  Mail,
  Eye,
  EyeOff,
  AlertTriangle
} from 'lucide-react'

import { supabase } from './lib'
import { DataProvider, useData } from './data'
import {
  Layout,
  Button,
  Input
} from './ui'

import * as Pages from './pages'


/* =====================================================================
   AUTH
   ===================================================================== */

export function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      try {
        const {
          data,
          error
        } = await supabase.auth.getSession()

        if (error) throw error

        if (mounted) {
          setSession(data?.session || null)
        }
      } catch (error) {
        console.error(
          '[auth] getSession:',
          error
        )

        if (mounted) {
          setSession(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadSession()

    const {
      data: listener
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!mounted) return
        setSession(nextSession || null)
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      listener?.subscription?.unsubscribe()
    }
  }, [])

  async function signOut() {
    const {
      error
    } = await supabase.auth.signOut()

    if (error) {
      console.error(
        '[auth] signOut:',
        error
      )
      throw error
    }

    setSession(null)
  }

  return {
    session,
    loading,
    signOut
  }
}


/* =====================================================================
   LOADING
   ===================================================================== */

function AppLoading() {
  return (
    <div className="auth-screen">
      <div className="auth-card auth-loading">
        <div className="auth-logo">
          MF
        </div>

        <Loader2
          size={22}
          className="spin"
        />

        <span>
          Carregando…
        </span>
      </div>
    </div>
  )
}


/* =====================================================================
   LOGIN
   ===================================================================== */

function LoginPage() {
  const navigate = useNavigate()

  const [email, setEmail] =
    useState('')

  const [password, setPassword] =
    useState('')

  const [showPassword, setShowPassword] =
    useState(false)

  const [busy, setBusy] =
    useState(false)

  const [error, setError] =
    useState('')

  const [message, setMessage] =
    useState('')

  async function submit(e) {
    e.preventDefault()

    setError('')
    setMessage('')

    const cleanEmail =
      email.trim().toLowerCase()

    if (!cleanEmail) {
      setError(
        'Informe seu e-mail.'
      )
      return
    }

    if (!password) {
      setError(
        'Informe sua senha.'
      )
      return
    }

    setBusy(true)

    try {
      const {
        data,
        error: authError
      } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      })

      if (authError) {
        throw authError
      }

      if (!data?.session) {
        throw new Error(
          'Login realizado, mas a sessão não foi criada.'
        )
      }

      navigate('/painel', {
        replace: true
      })
    } catch (err) {
      console.error(
        '[login]:',
        err
      )

      setError(
        friendlyAuthError(err)
      )
    } finally {
      setBusy(false)
    }
  }

  async function recoverPassword() {
    setError('')
    setMessage('')

    const cleanEmail =
      email.trim().toLowerCase()

    if (!cleanEmail) {
      setError(
        'Informe seu e-mail para recuperar a senha.'
      )
      return
    }

    setBusy(true)

    try {
      const {
        error: resetError
      } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo:
            `${window.location.origin}/reset-password`
        }
      )

      if (resetError) {
        throw resetError
      }

      setMessage(
        'Enviamos um link para redefinição da senha.'
      )
    } catch (err) {
      console.error(
        '[password-reset]:',
        err
      )

      setError(
        friendlyAuthError(err)
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">

        <div className="auth-brand">
          <div className="auth-logo">
            MF
          </div>

          <div>
            <h1>
              Meu Financeiro
            </h1>

            <p>
              Controle financeiro pessoal
            </p>
          </div>
        </div>

        <div className="auth-heading">
          <h2>
            Entrar
          </h2>

          <p>
            Acesse sua conta para continuar.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={submit}
        >
          <label className="auth-field">
            <span>
              <Mail size={16} />
              E-mail
            </span>

            <Input
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="seu@email.com"
              disabled={busy}
              autoFocus
            />
          </label>

          <label className="auth-field">
            <span>
              <LockKeyhole size={16} />
              Senha
            </span>

            <div className="auth-password">
              <Input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                autoComplete="current-password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                placeholder="Sua senha"
                disabled={busy}
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() =>
                  setShowPassword(
                    (value) => !value
                  )
                }
                aria-label={
                  showPassword
                    ? 'Ocultar senha'
                    : 'Mostrar senha'
                }
                disabled={busy}
              >
                {showPassword
                  ? <EyeOff size={17} />
                  : <Eye size={17} />}
              </button>
            </div>
          </label>

          {error && (
            <div
              className="auth-error"
              role="alert"
            >
              <AlertTriangle
                size={17}
              />

              <span>
                {error}
              </span>
            </div>
          )}

          {message && (
            <div className="auth-message">
              {message}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            busy={busy}
          >
            Entrar
          </Button>

          <button
            type="button"
            className="auth-link"
            onClick={recoverPassword}
            disabled={busy}
          >
            Esqueci minha senha
          </button>
        </form>
      </div>
    </div>
  )
}


/* =====================================================================
   ERROS DE AUTENTICAÇÃO
   ===================================================================== */

function friendlyAuthError(error) {
  const message =
    String(
      error?.message || ''
    ).toLowerCase()

  if (
    message.includes(
      'invalid login credentials'
    )
  ) {
    return 'E-mail ou senha incorretos.'
  }

  if (
    message.includes(
      'email not confirmed'
    )
  ) {
    return 'Seu e-mail ainda não foi confirmado.'
  }

  if (
    message.includes(
      'user not found'
    )
  ) {
    return 'Usuário não encontrado.'
  }

  if (
    message.includes(
      'too many requests'
    )
  ) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  }

  if (
    message.includes(
      'network'
    ) ||
    message.includes(
      'fetch'
    )
  ) {
    return 'Não foi possível conectar ao servidor. Verifique sua internet.'
  }

  return (
    error?.message ||
    'Não foi possível realizar o login.'
  )
}


/* =====================================================================
   ROTA PROTEGIDA
   ===================================================================== */

function ProtectedRoute({
  children,
  session
}) {
  const location =
    useLocation()

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname +
            location.search
        }}
      />
    )
  }

  return children
}


/* =====================================================================
   APLICAÇÃO AUTENTICADA
   ===================================================================== */

function AuthenticatedApp({
  session
}) {
  const navigate =
    useNavigate()

  const [newEntryOpen, setNewEntryOpen] =
    useState(false)

  const {
    loading: dataLoading,
    error: dataError
  } = useData()

  const route =
    useLocation().pathname
      .replace(/^\/+/, '')
      .split('/')[0] || 'painel'

  const go =
    (path) =>
      navigate(`/${path}`)

  if (dataLoading) {
    return <AppLoading />
  }

  if (dataError) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-logo">
            MF
          </div>

          <h2>
            Não foi possível carregar seus dados
          </h2>

          <p className="auth-description">
            Sua sessão está ativa, mas houve
            um problema ao carregar os dados
            financeiros.
          </p>

          <div className="auth-error">
            <AlertTriangle size={17} />
            <span>
              {typeof dataError === 'string'
                ? dataError
                : dataError?.message ||
                  'Erro desconhecido.'}
            </span>
          </div>

          <Button
            onClick={() =>
              window.location.reload()
            }
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Layout
      route={route}
      navigate={go}
      onNewEntry={() =>
        setNewEntryOpen(true)
      }
    >
      <Routes>

        <Route
          path="/"
          element={
            <Navigate
              to="/painel"
              replace
            />
          }
        />

        <Route
          path="/painel"
          element={
            <Page
              name="Dashboard"
              candidates={[
                Pages.Dashboard,
                Pages.Painel
              ]}
            />
          }
        />

        <Route
          path="/fluxo"
          element={
            <Page
              name="Fluxo"
              candidates={[
                Pages.Flow,
                Pages.Fluxo
              ]}
            />
          }
        />

        <Route
          path="/lancamentos"
          element={
            <Page
              name="Lançamentos"
              candidates={[
                Pages.Transactions,
                Pages.Lancamentos
              ]}
          />
          }
        />

        <Route
          path="/contas"
          element={
            <Page
              name="Contas"
              candidates={[
                Pages.Accounts,
                Pages.Contas
              ]}
            />
          }
        />

        <Route
          path="/cartoes"
          element={
            <Page
              name="Cartões"
              candidates={[
                Pages.Cards,
                Pages.Cartoes
              ]}
            />
          }
        />

        <Route
          path="/investimentos"
          element={
            <Page
              name="Investimentos"
              candidates={[
                Pages.Investments,
                Pages.Investimentos
              ]}
            />
          }
        />

        <Route
          path="/imoveis"
          element={
            <Page
              name="Imóveis"
              candidates={[
                Pages.Properties,
                Pages.Imoveis
              ]}
            />
          }
        />

        <Route
          path="/assinaturas"
          element={
            <Page
              name="Assinaturas"
              candidates={[
                Pages.Subscriptions,
                Pages.Assinaturas
              ]}
            />
          }
        />

        <Route
          path="/saude"
          element={
            <Page
              name="Saúde"
              candidates={[
                Pages.Health,
                Pages.Saude
              ]}
            />
          }
        />

        <Route
          path="/capital"
          element={
            <Page
              name="Custos de capital"
              candidates={[
                Pages.Capital,
                Pages.CustosCapital
              ]}
            />
          }
        />

        <Route
          path="/importar"
          element={
            <Page
              name="Importar extratos"
              candidates={[
                Pages.Import,
                Pages.Importar
              ]}
            />
          }
        />

        <Route
          path="/ajustes"
          element={
            <Page
              name="Ajustes"
              candidates={[
                Pages.Settings,
                Pages.Ajustes
              ]}
            />
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/painel"
              replace
            />
          }
        />

      </Routes>

      <NewEntryBridge
        open={newEntryOpen}
        onClose={() =>
          setNewEntryOpen(false)
        }
      />
    </Layout>
  )
}


/* =====================================================================
   RESOLUÇÃO DAS PÁGINAS
   ===================================================================== */

function Page({
  candidates = [],
  name
}) {
  const Component =
    candidates.find(
      (item) =>
        typeof item === 'function'
    )

  if (!Component) {
    return (
      <div className="card">
        <h2>
          {name}
        </h2>

        <p>
          A página não foi encontrada.
        </p>
      </div>
    )
  }

  return <Component />
}


/* =====================================================================
   NOVO LANÇAMENTO
   ===================================================================== */

function NewEntryBridge({
  open,
  onClose
}) {
  const TransactionSheet =
    Pages.TransactionSheet ||
    Pages.TransactionForm

  if (!TransactionSheet) {
    return null
  }

  return (
    <TransactionSheet
      open={open}
      record={null}
      onClose={onClose}
    />
  )
}


/* =====================================================================
   ROOT
   ===================================================================== */

function Root() {
  const {
    session,
    loading
  } = useAuth()

  if (loading) {
    return <AppLoading />
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          session
            ? (
              <Navigate
                to="/painel"
                replace
              />
            )
            : <LoginPage />
        }
      />

      <Route
        path="/*"
        element={
          session
            ? (
              <DataProvider>
                <AuthenticatedApp
                  session={session}
                />
              </DataProvider>
            )
            : (
              <Navigate
                to="/login"
                replace
              />
            )
        }
      />
    </Routes>
  )
}


/* =====================================================================
   EXPORT
   ===================================================================== */

export default function App() {
  return (
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  )
}
