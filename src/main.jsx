/* =====================================================================
   main.jsx — entrada da aplicação, autenticação, roteamento e
   tratamento global de erros.
   ===================================================================== */

import React, { useCallback, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'

import {
  AuthProvider,
  DataProvider,
  useAuth,
  useData
} from './data'

import {
  Button,
  Card,
  Layout,
  Loading,
  TransactionSheet
} from './ui'

import {
  Login,
  Dashboard,
  CashFlow,
  Transactions,
  Accounts,
  Cards,
  Investments,
  Properties,
  Subscriptions,
  Health,
  Capital,
  Import,
  Settings
} from './pages'

import './styles.css'

/* ---------------------------------------------------------------------
   Rotas disponíveis
   --------------------------------------------------------------------- */

const PAGES = {
  painel: Dashboard,
  fluxo: CashFlow,
  lancamentos: Transactions,
  contas: Accounts,
  cartoes: Cards,
  investimentos: Investments,
  imoveis: Properties,
  assinaturas: Subscriptions,
  saude: Health,
  capital: Capital,
  importar: Import,
  ajustes: Settings
}

/* ---------------------------------------------------------------------
   Tela de erro controlada
   --------------------------------------------------------------------- */

function Failure({ title, detail, onReset }) {
  return (
    <main className="screen-center">
      <div
        className="auth-card"
        style={{
          margin: 16,
          maxWidth: 520,
          width: 'calc(100% - 32px)'
        }}
      >
        <h2>{title}</h2>

        <p className="hint">
          {detail}
        </p>

        <div className="card-actions">
          <button
            className="btn btn-solid btn-md"
            type="button"
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>

          {onReset && (
            <button
              className="btn btn-outline btn-md"
              type="button"
              onClick={onReset}
            >
              Limpar sessão e recomeçar
            </button>
          )}
        </div>
      </div>
    </main>
  )
}

/* ---------------------------------------------------------------------
   Error Boundary

   Impede que um erro de renderização transforme a aplicação inteira
   em uma tela branca.
   --------------------------------------------------------------------- */

class Boundary extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      error: null
    }
  }

  static getDerivedStateFromError(error) {
    return {
      error
    }
  }

  componentDidCatch(error, info) {
    console.error(
      '[Meu Financeiro] Falha na renderização:',
      error,
      info
    )
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    const error = this.state.error

    return (
      <Failure
        title="Algo deu errado ao abrir esta tela"
        detail={
          error?.message ||
          String(error) ||
          'Erro desconhecido.'
        }
        onReset={() => {
          try {
            window.localStorage.clear()
          } catch {
            // Não interrompe o reset se localStorage estiver indisponível.
          }

          try {
            window.sessionStorage.clear()
          } catch {
            // Não interrompe o reset se sessionStorage estiver indisponível.
          }

          window.location.hash = '#/painel'
          window.location.reload()
        }}
      />
    )
  }
}

/* ---------------------------------------------------------------------
   Roteamento por hash

   Necessário para funcionar corretamente no GitHub Pages.
   --------------------------------------------------------------------- */

function useHashRoute() {
  const readRoute = useCallback(() => {
    const hash = window.location.hash || ''

    const raw = hash
      .replace(/^#\/?/, '')
      .split('?')[0]
      .split('&')[0]

    return PAGES[raw] ? raw : 'painel'
  }, [])

  const [route, setRoute] = useState(readRoute)

  useEffect(() => {
    const onHashChange = () => {
      setRoute(readRoute())

      try {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'instant'
        })
      } catch {
        window.scrollTo(0, 0)
      }
    }

    window.addEventListener('hashchange', onHashChange)

    /*
     * Não força imediatamente #/painel quando o Supabase estiver
     * processando um callback de autenticação.
     *
     * Isso é importante principalmente para confirmação de e-mail,
     * recuperação de senha e OAuth.
     */

    const hash = window.location.hash || ''

    const isSupabaseCallback =
      /access_token=/i.test(hash) ||
      /refresh_token=/i.test(hash) ||
      /code=/i.test(hash) ||
      /type=recovery/i.test(hash) ||
      /type=signup/i.test(hash) ||
      /type=magiclink/i.test(hash)

    const raw = hash
      .replace(/^#\/?/, '')
      .split('?')[0]

    if (!PAGES[raw] && !isSupabaseCallback) {
      /*
       * Só normaliza hashes claramente inválidos.
       *
       * replaceState evita adicionar uma entrada desnecessária
       * no histórico do navegador.
       */
      window.location.hash = '#/painel'
    }

    return () => {
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [readRoute])

  const navigate = useCallback((path) => {
    if (!PAGES[path]) {
      console.warn(
        `[Meu Financeiro] Rota inexistente: ${path}`
      )
      return
    }

    const target = `#/${path}`

    if (window.location.hash !== target) {
      window.location.hash = target
    }
  }, [])

  return [route, navigate]
}

/* ---------------------------------------------------------------------
   Área autenticada
   --------------------------------------------------------------------- */

function Workspace() {
  const [route, navigate] = useHashRoute()

  const [entryOpen, setEntryOpen] = useState(false)

  const {
    status,
    error,
    reload
  } = useData()

  const Page = PAGES[route] || Dashboard

  return (
    <Layout
      route={route}
      navigate={navigate}
      onNewEntry={() => setEntryOpen(true)}
    >
      {status === 'loading' && (
        <Loading label="Carregando seus dados" />
      )}

      {status === 'error' && (
        <Card title="Não foi possível carregar todos os dados">
          <p>
            {error ||
              'O sistema encontrou um problema ao carregar os dados.'}
          </p>

          <p className="hint">
            Sua sessão continua preservada. Você pode tentar
            carregar novamente sem precisar fazer login outra vez.
          </p>

          <div className="card-actions">
            <Button
              type="button"
              onClick={reload}
            >
              Tentar novamente
            </Button>
          </div>
        </Card>
      )}

      {status === 'ready' && (
        <Boundary>
          <Page navigate={navigate} />
        </Boundary>
      )}

      <TransactionSheet
        open={entryOpen}
        record={null}
        onClose={() => setEntryOpen(false)}
      />
    </Layout>
  )
}

/* ---------------------------------------------------------------------
   Aplicação principal
   --------------------------------------------------------------------- */

function App() {
  const {
    session,
    loading
  } = useAuth()

  /*
   * Primeiro aguardamos a recuperação da sessão.
   *
   * Isso evita que o DataProvider seja montado antes de sabermos
   * se existe usuário autenticado.
   */

  if (loading) {
    return (
      <div className="screen-center">
        <Loading label="Verificando sessão" />
      </div>
    )
  }

  /*
   * Sem sessão = tela de login.
   */

  if (!session) {
    return <Login />
  }

  /*
   * Somente depois da sessão existir carregamos os dados privados.
   */

  return (
    <DataProvider>
      <Workspace />
    </DataProvider>
  )
}

/* ---------------------------------------------------------------------
   Inicialização
   --------------------------------------------------------------------- */

const container = document.getElementById('root')

if (!container) {
  throw new Error(
    'Elemento #root não encontrado no index.html.'
  )
}

const root = ReactDOM.createRoot(container)

/*
 * Variáveis públicas do Supabase.
 *
 * A ANON KEY é apropriada para frontend.
 * A segurança dos dados deve ser garantida pelas políticas RLS
 * do Supabase.
 */

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/*
 * Captura erros globais que eventualmente ocorram antes do
 * React conseguir renderizar a interface.
 */

window.addEventListener(
  'error',
  (event) => {
    console.error(
      '[Meu Financeiro] Erro global:',
      event.error || event.message
    )
  }
)

window.addEventListener(
  'unhandledrejection',
  (event) => {
    console.error(
      '[Meu Financeiro] Promise rejeitada:',
      event.reason
    )
  }
)

/*
 * Sem as variáveis do Supabase, não tentamos montar a aplicação.
 */

if (!url || !key) {
  root.render(
    <Failure
      title="Configuração do Supabase ausente"
      detail={
        'O site foi publicado sem VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY. ' +
        'Confira os Secrets do GitHub e execute novamente o workflow de deploy.'
      }
    />
  )
} else {
  root.render(
    <React.StrictMode>
      <Boundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Boundary>
    </React.StrictMode>
  )
}
