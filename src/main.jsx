/* =====================================================================
   main.jsx — ponto de entrada, roteamento por hash e montagem do app.
   ===================================================================== */
import React, { useCallback, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider, DataProvider, useAuth, useData } from './data'
import { Button, Card, Layout, Loading, TransactionSheet } from './ui'
import {
  Login, Dashboard, CashFlow, Transactions, Accounts, Cards, Investments,
  Properties, Subscriptions, Health, Capital, Import, Settings
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
  ajustes: Settings
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
    if (!window.location.hash) window.location.replace('#/painel')
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
            Se a mensagem falar em tabela ou coluna ausente, rode a migração
            <code> 0002_full_system.sql </code> no SQL Editor do Supabase e tente de novo.
          </p>
          <div className="card-actions"><Button onClick={reload}>Tentar de novo</Button></div>
        </Card>
      )}
      {status === 'ready' && <Page navigate={navigate} />}
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)
