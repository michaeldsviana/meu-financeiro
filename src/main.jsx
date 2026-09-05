/* =====================================================================
   main.jsx — ponto de entrada, roteamento por hash, montagem do app
   e captura de erros (para nunca mais cair em tela branca).
   ===================================================================== */
import React, { useCallback, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider, DataProvider, useAuth, useData } from './data'
import { Button, Card, Layout, Loading, TransactionSheet } from './ui'
import {
  Login, Dashboard, CashFlow, Transactions, Accounts, Cards, Investments,
  Properties, Subscriptions, Health, Capital, Import, Settings, Profile
} from './pages'
import './styles.css'

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
  ajustes: Settings,
  perfil: Profile
}

/* -------------------------------------------------------------------
   Tela de falha: mostra o erro em vez de deixar a página vazia.
   ------------------------------------------------------------------- */
function Failure({ title, detail, onReset }) {
  return (
    <main className="screen-center">
      <div className="auth-card" style={{ margin: 16 }}>
        <h2>{title}</h2>
        <p className="hint">{detail}</p>
        <div className="card-actions">
          <button className="btn btn-solid btn-md" onClick={() => window.location.reload()}>
            Recarregar
          </button>
          {onReset && (
            <button className="btn btn-outline btn-md" onClick={onReset}>
              Limpar sessão e recomeçar
            </button>
          )}
        </div>
      </div>
    </main>
  )
}

class Boundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Falha na renderização:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <Failure
        title="Algo quebrou ao desenhar a tela"
        detail={String(this.state.error?.message || this.state.error)}
        onReset={() => {
          try { window.localStorage.clear() } catch { /* ignora */ }
          window.location.hash = '#/painel'
          window.location.reload()
        }}
      />
    )
  }
}

/** Rotas por hash: funcionam no GitHub Pages sem configuração de servidor. */
function useHashRoute() {
  const read = () => {
    const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0]
    return PAGES[raw] ? raw : 'painel'
  }
  const [route, setRoute] = useState(read)

  useEffect(() => {
    const onChange = () => {
      setRoute(read())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    // O Supabase devolve o token no hash depois da confirmação de e-mail.
    // Só assumimos a rota padrão quando o hash não é uma rota nossa.
    const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0]
    if (!PAGES[raw]) window.location.replace('#/painel')
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = useCallback((path) => { window.location.hash = `#/${path}` }, [])
  return [route, navigate]
}

function Workspace() {
  const [route, navigate] = useHashRoute()
  const [entryOpen, setEntryOpen] = useState(false)
  const { status, error, reload } = useData()
  const Page = PAGES[route] || Dashboard

  return (
    <Layout route={route} navigate={navigate} onNewEntry={() => setEntryOpen(true)}>
      {status === 'loading' && <Loading label="Carregando seus dados" />}
      {status === 'error' && (
        <Card title="Não foi possível carregar">
          <p>{error}</p>
          <p className="hint">
            Se a mensagem falar em tabela, coluna ou permissão, rode a migração
            <code> 0002_full_system.sql </code> no SQL Editor do Supabase e tente de novo.
          </p>
          <div className="card-actions"><Button onClick={reload}>Tentar de novo</Button></div>
        </Card>
      )}
      {status === 'ready' && <Boundary><Page navigate={navigate} /></Boundary>}
      <TransactionSheet open={entryOpen} record={null} onClose={() => setEntryOpen(false)} />
    </Layout>
  )
}

function App() {
  const { session, loading } = useAuth()
  if (loading) return <div className="screen-center"><Loading label="Verificando sessão" /></div>
  if (!session) return <Login />
  return (
    <DataProvider>
      <Workspace />
    </DataProvider>
  )
}

/* -------------------------------------------------------------------
   Montagem, com verificação das variáveis e captura de erro precoce.
   ------------------------------------------------------------------- */
const container = document.getElementById('root')
const root = ReactDOM.createRoot(container)

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

window.addEventListener('error', (e) => {
  if (container.childElementCount === 0) return
  const box = document.getElementById('boot-error')
  if (!box) return
  // textContent, nunca innerHTML: a mensagem de erro não é confiável.
  box.style.display = 'block'
  box.textContent = String(e.message || 'sem mensagem')
})

if (!url || !key) {
  root.render(
    <Failure
      title="Faltam as variáveis do Supabase"
      detail="O site foi publicado sem VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY. Cadastre os dois secrets no GitHub e rode o workflow de novo."
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
