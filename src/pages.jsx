/* =====================================================================
   pages.jsx — uma seção do app por bloco.
   ===================================================================== */
import { ArrowRight, Camera, Check, FileUp, LogOut, PiggyBank, Plus, Scale, Search, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, TriangleAlert, Undo2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SETTLED, TABLES, monthOverview, settledCommitment, readStatementFile, invoiceSummary, avatarUrl, uploadAvatar, removeAvatar, updatePassword, verifyPassword, accountLedgerBalance, accountsOverview, addMonths, applyFilters, baseline, cardInvoice, cardLedgerDebt, cardsOverview, cashProjection, categorize, cleanNumberInput, commitmentsForMonth, currentMonth, dayLabel, decimal, defaultHints, deleteRow, dueDateInMonth, ensureDefaults, fetchSettings, fetchTable, fingerprint, flowForMonth, flowSeries, friendlyError, fullDate, groupByCategory, initials, insertMany, insertRow, iso, money, monthEnd, monthKey, monthLabel, monthRange, monthStart, monthlyRateOf, monthsBetween, n, netWorth, nextOccurrence, normalize, objectivesOverview, occurrencesIn, parseCsv, parseMoney, parseOfx, parseStatement, parseStatementDate, pendingInterest, percent, projectInvestments, reservePlan, saveRow, saveSettings, suggestPattern, sum, supabase, toDate, today, totalCardDebt, totalCash, totalInvested, txMonth, updateRow, withOccurrenceIndex } from './lib'
import { useAuth, useData, useLookup } from './data'
import { Amount, BalanceChart, Button, Card, CategoryChart, ConfirmDelete, Empty, Field, FlowChart, IconButton, Input, Layout, Loading, MoneyField, NAV, NetWorthChart, PALETTE, Pill, ProgressBar, RecordSheet, Row, RunwayStrip, Segmented, Select, Sheet, Switch, Textarea, Toast, TransactionSheet, toPercentInput } from './ui'

/* ---------- Login ---------- */
const MODES = {
  signin: { title: 'Entrar', cta: 'Entrar' },
  signup: { title: 'Criar conta', cta: 'Criar conta' },
  reset: { title: 'Recuperar senha', cta: 'Enviar link' }
}

export function Login() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const missingConfig = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (mode === 'reset') {
        const { error: err } = await resetPassword(email)
        if (err) throw err
        setMessage('Se existir uma conta com este e-mail, o link de redefinição chegará em instantes.')
      } else if (mode === 'signup') {
        const { data, error: err } = await signUp(email, password)
        if (err) throw err
        if (!data.session) setMessage('Conta criada. Confirme o e-mail para entrar.')
      } else {
        const { error: err } = await signIn(email, password)
        if (err) throw err
      }
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth">
      <div className="auth-panel">
        <div className="auth-brand">
          <img className="mark" src="./icon-192.png" alt="Meu Financeiro" width="44" height="44" />
          <b>Meu Financeiro</b>
        </div>
        <h1>Um lugar só para o seu dinheiro.</h1>
        <p>
          Informe os saldos e os compromissos. O sistema calcula o fluxo de caixa, projeta os
          próximos meses e diz quanto guardar para cada obrigação futura.
        </p>
        <ul className="auth-list">
          <li>Contas e cartões separados, com conciliação de saldo</li>
          <li>Importação de extratos CSV e OFX com categorização</li>
          <li>Investimentos por objetivo, com juros atualizados todo mês</li>
        </ul>
      </div>

      <form className="auth-card" onSubmit={submit}>
        <h2>{MODES[mode].title}</h2>

        {missingConfig && (
          <div className="alert alert-warn">
            Faltam as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Configure o arquivo .env.local
            para desenvolver, ou os Secrets do repositório para publicar.
          </div>
        )}

        <label>
          E-mail
          <input type="email" autoComplete="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} />
        </label>

        {mode !== 'reset' && (
          <label>
            Senha
            <input
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}

        <button className="btn btn-solid btn-lg" disabled={busy}>
          {busy ? 'Aguarde…' : MODES[mode].cta}
        </button>

        {error && <p className="auth-error">{error}</p>}
        {message && <p className="auth-message">{message}</p>}

        <div className="auth-switch">
          {mode !== 'signin' && <button type="button" onClick={() => setMode('signin')}>Já tenho conta</button>}
          {mode !== 'signup' && <button type="button" onClick={() => setMode('signup')}>Criar uma conta</button>}
          {mode !== 'reset' && <button type="button" onClick={() => setMode('reset')}>Esqueci a senha</button>}
        </div>
      </form>
    </main>
  )
}

/* ---------- Dashboard ---------- */
export function Dashboard({ navigate }) {
  const data = useData()
  const { month, hideValues: hide } = data
  const [focusMonth, setFocusMonth] = useState(null)

  const nw = useMemo(() => netWorth(data), [data])
  const projection = useMemo(
    () => cashProjection(data, { from: currentMonth(), horizon: data.settings?.projection_months || 12 }),
    [data]
  )
  const reserve = useMemo(() => reservePlan(data), [data])
  const flow = useMemo(() => flowForMonth(data.transactions, month), [data.transactions, month])
  const overview = useMemo(() => monthOverview(data, month), [data, month])
  const byCategory = useMemo(
    () => groupByCategory(data.transactions, data.categories, month),
    [data.transactions, data.categories, month]
  )
  const commitments = overview.commitments
  const accounts = useMemo(() => accountsOverview(data.accounts, data.transactions), [data.accounts, data.transactions])
  const cards = useMemo(() => cardsOverview(data.cards, data.transactions), [data.cards, data.transactions])
  const objectives = useMemo(
    () => objectivesOverview(data.objectives, data.investments, data.allocations),
    [data.objectives, data.investments, data.allocations]
  )

  const detail = projection.find((p) => p.month === focusMonth)
  const firstNegative = projection.find((p) => p.balance < 0)
  const empty = !data.accounts.length && !data.transactions.length

  if (empty) {
    return (
      <Card>
        <Empty
          title="Comece informando seus saldos"
          hint="Cadastre suas contas bancárias em Contas e seus cartões em Cartões. Depois lance ou importe as movimentações — o fluxo de caixa e a reserva mensal são calculados sozinhos."
          action={(
            <button className="btn btn-solid btn-md" onClick={() => navigate('contas')}>
              Cadastrar conta <ArrowRight size={16} />
            </button>
          )}
        />
      </Card>
    )
  }

  return (
    <div className="stack">
      <section className="hero">
        <div className="hero-main">
          <span className="hero-label">Patrimônio líquido</span>
          <strong className="hero-value">{money(nw.total, { hide })}</strong>
          <span className="hero-note">
            {money(nw.assets, { hide })} em bens · {money(nw.liabilities, { hide })} em obrigações
          </span>
        </div>
        <dl className="hero-breakdown">
          <div><dt>Caixa</dt><dd>{money(nw.cash, { hide })}</dd></div>
          <div><dt>Investido</dt><dd>{money(nw.investments, { hide })}</dd></div>
          <div><dt>Imóveis</dt><dd>{money(nw.properties, { hide })}</dd></div>
          <div><dt>Cartões</dt><dd className="neg">−{money(nw.cards, { hide })}</dd></div>
          <div><dt>Dívidas</dt><dd className="neg">−{money(nw.debts, { hide })}</dd></div>
        </dl>
      </section>

      <Card
        title="Régua de caixa"
        subtitle="Saldo projetado mês a mês, já descontando compromissos conhecidos."
        action={<button className="link" onClick={() => navigate('fluxo')}>Ver fluxo</button>}
      >
        <RunwayStrip
          months={projection}
          reserve={reserve.monthlyTotal * 3}
          hide={hide}
          selected={focusMonth}
          onSelect={(m) => setFocusMonth(m === focusMonth ? null : m)}
        />
        {detail ? (
          <div className="runway-detail">
            <b>{monthLabel(detail.month, { long: true })}</b>
            <span>Entradas <Amount value={detail.income} hide={hide} /></span>
            <span>Saídas <Amount value={-detail.expense} hide={hide} /></span>
            <span>Saldo final <Amount value={detail.balance} hide={hide} tone={detail.balance < 0 ? 'down' : 'up'} /></span>
            <Pill tone={detail.mode === 'previsto' ? 'neutral' : 'accent'}>{detail.mode}</Pill>
          </div>
        ) : (
          <p className="hint">Toque em um mês para ver a composição.</p>
        )}
        {firstNegative && (
          <div className="alert alert-warn">
            <TriangleAlert size={16} />
            O saldo fica negativo em {monthLabel(firstNegative.month, { long: true })}.
            Reveja os compromissos desse mês ou reforce o caixa antes.
          </div>
        )}
      </Card>

      <Card
        title="Guardar este mês"
        subtitle="Quanto separar agora para não ser surpreendido pelas obrigações futuras."
        action={<Pill tone="accent">{money(reserve.monthlyTotal, { hide })}</Pill>}
      >
        {reserve.items.length ? (
          <div className="list">
            {reserve.items.slice(0, 6).map((item) => (
              <Row
                key={item.id}
                leading={<PiggyBank size={16} />}
                label={item.name}
                sub={item.dueKey
                  ? `${item.context} · ${money(item.amount, { hide })} em ${monthLabel(item.dueKey)} · faltam ${item.monthsLeft} ${item.monthsLeft === 1 ? 'mês' : 'meses'}`
                  : item.context}
                right={<Amount value={item.monthly} hide={hide} />}
              />
            ))}
          </div>
        ) : (
          <Empty
            title="Nenhuma obrigação futura cadastrada"
            hint="Cadastre IPTU, seguros e outras contas anuais em Imóveis para o sistema dividir o valor pelos meses que faltam."
          />
        )}
        {reserve.emergencyTarget > 0 && (
          <div className="reserve-goal">
            <div>
              <span>Reserva de emergência</span>
              <b>{money(nw.cash, { hide })} de {money(reserve.emergencyTarget, { hide })}</b>
            </div>
            <ProgressBar value={reserve.emergencyTarget ? nw.cash / reserve.emergencyTarget : 0} />
          </div>
        )}
      </Card>

      <div className="grid-2">
        <Card title={`Resultado de ${monthLabel(month, { long: true })}`}>
          <div className="kpis">
            <div><span>Receitas</span><Amount value={flow.income} hide={hide} tone="up" /></div>
            <div><span>Despesa total</span><Amount value={overview.totalEsperado} hide={hide} tone="down" /></div>
            <div><span>Aportes</span><Amount value={flow.invested} hide={hide} /></div>
            <div><span>Sobra prevista</span>
              <Amount value={overview.resultadoEsperado - flow.invested} hide={hide} signed />
            </div>
          </div>
          <div className="list">
            <Row label="Já lançado" sub="Passou pelo razão ou veio do extrato"
              right={<Amount value={-overview.lancado} hide={hide} />} />
            <Row label="Ainda a pagar" sub="Recorrentes cadastrados que não apareceram no razão"
              right={<Amount value={-overview.aPagar} hide={hide} />} />
          </div>
          {flow.income > 0 && (
            <p className="hint">
              Se tudo correr como previsto, sobram{' '}
              {Math.round(((overview.resultadoEsperado - flow.invested) / flow.income) * 100)}% do que entrou.
            </p>
          )}
        </Card>

        <Card
          title="Recorrentes do mês"
          subtitle={
            commitments.length
              ? `${commitments.length - overview.pendentes.length} de ${commitments.length} já no razão`
              : 'nada cadastrado'
          }
        >
          {commitments.length ? (
            <>
              {overview.pendentes.length > 0 && (
                <div className="alert alert-warn">
                  <TriangleAlert size={16} />
                  {overview.pendentes.length === 1
                    ? 'Falta 1 despesa recorrente aparecer no razão'
                    : `Faltam ${overview.pendentes.length} despesas recorrentes aparecerem no razão`}
                  {' '}({money(overview.aPagar, { hide })}).
                </div>
              )}
              <div className="list list-scroll">
                {commitments.slice(0, 10).map((c) => (
                  <Row
                    key={c.id}
                    label={c.name}
                    badge={c.settled
                      ? <Pill tone="accent">no razão</Pill>
                      : <Pill tone="warn">a pagar</Pill>}
                    sub={`${c.source} · ${dayLabel(c.date)}${c.projected ? ' · projetado' : ''}`}
                    right={<Amount value={-c.amount} hide={hide} tone={c.settled ? 'flat' : 'down'} />}
                  />
                ))}
              </div>
            </>
          ) : (
            <Empty
              title="Nada recorrente cadastrado"
              hint="Assinaturas, obrigações de imóveis, parcelas e custos de saúde marcados como recorrentes aparecem aqui."
            />
          )}
        </Card>
      </div>

      <Card title="Despesas por categoria" subtitle={monthLabel(month, { long: true })}>
        {byCategory.length
          ? <CategoryChart data={byCategory} hide={hide} />
          : <Empty title="Sem despesas neste mês" hint="Lance manualmente ou importe o extrato." />}
      </Card>

      <div className="grid-2">
        <Card title="Contas" action={<button className="link" onClick={() => navigate('contas')}>Gerenciar</button>}>
          {accounts.length ? (
            <div className="list">
              {accounts.filter((a) => !a.archived).map((a) => (
                <Row key={a.id} label={a.name} sub={a.bank || a.account_type}
                  right={(
                    <span className="row-stack">
                      <Amount value={a.informed} hide={hide} />
                      {Math.abs(a.difference) > 0.005 && (
                        <small className="warn">difere {money(a.difference, { hide })}</small>
                      )}
                    </span>
                  )} />
              ))}
            </div>
          ) : <Empty title="Nenhuma conta" hint="Cadastre para acompanhar o caixa." />}
        </Card>

        <Card title="Cartões" action={<button className="link" onClick={() => navigate('cartoes')}>Gerenciar</button>}>
          {cards.length ? (
            <div className="list">
              {cards.filter((c) => !c.archived).map((c) => (
                <Row key={c.id} label={c.name}
                  sub={c.credit_limit > 0 ? `${Math.round(c.usage * 100)}% do limite` : c.institution}
                  right={<Amount value={c.informed} hide={hide} tone="down" />} />
              ))}
            </div>
          ) : <Empty title="Nenhum cartão" hint="Cadastre para acompanhar as faturas." />}
        </Card>
      </div>

      {objectives.length > 0 && (
        <Card title="Objetivos" action={<button className="link" onClick={() => navigate('investimentos')}>Ver todos</button>}>
          <div className="goals">
            {objectives.filter((o) => !o.archived).slice(0, 4).map((o) => (
              <div key={o.id} className="goal">
                <div className="goal-head">
                  <b>{o.name}</b>
                  <span>{money(o.current, { hide })}{o.target > 0 ? ` de ${money(o.target, { hide })}` : ''}</span>
                </div>
                {o.progress != null && <ProgressBar value={o.progress} />}
                {o.neededMonthly > 0 && (
                  <small>Aportar {money(o.neededMonthly, { hide })} por mês para chegar no prazo.</small>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

/* ---------- CashFlow ---------- */
export function CashFlow() {
  const data = useData()
  const { hideValues: hide, month } = data
  const [view, setView] = useState('projecao')

  const horizon = data.settings?.projection_months || 12
  const history = useMemo(() => flowSeries(data.transactions, monthRange(addMonths(currentMonth(), -11), 12)),
    [data.transactions])
  const projection = useMemo(() => cashProjection(data, { from: currentMonth(), horizon }), [data, horizon])
  const reserve = useMemo(() => reservePlan(data), [data])
  const nw = useMemo(() => netWorth(data), [data])

  const snapshots = useMemo(() => [...data.snapshots]
    .sort((a, b) => String(a.reference_month).localeCompare(String(b.reference_month)))
    .map((s) => ({ ...s, month: String(s.reference_month).slice(0, 7) })), [data.snapshots])

  const selected = projection.find((p) => p.month === month) || projection[0]
  const last = projection[projection.length - 1]

  return (
    <div className="stack">
      <Card>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'projecao', label: 'Previsão' },
            { value: 'historico', label: 'Histórico' },
            { value: 'patrimonio', label: 'Patrimônio' }
          ]}
        />
      </Card>

      {view === 'projecao' && (
        <>
          <Card title="Saldo projetado" subtitle={`Próximos ${horizon} meses, a partir do caixa de hoje.`}>
            <BalanceChart series={projection} hide={hide} />
            <div className="kpis">
              <div><span>Caixa hoje</span><Amount value={nw.cash} hide={hide} /></div>
              <div><span>Em {monthLabel(last?.month)}</span><Amount value={last?.balance} hide={hide} signed /></div>
              <div><span>Guardar por mês</span><Amount value={reserve.monthlyTotal} hide={hide} /></div>
              <div><span>Menor saldo</span>
                <Amount value={Math.min(...projection.map((p) => p.balance))} hide={hide} signed />
              </div>
            </div>
          </Card>

          <Card title="Mês a mês">
            <div className="table">
              <div className="thead">
                <span>Mês</span><span>Entradas</span><span>Saídas</span><span>Saldo</span>
              </div>
              {projection.map((p) => (
                <div key={p.month} className={`trow ${p.balance < 0 ? 'trow-risk' : ''}`}>
                  <span className="tmonth">{monthLabel(p.month)} <i>{p.mode}</i></span>
                  <span>{money(p.income, { hide })}</span>
                  <span className="neg">{money(p.expense, { hide })}</span>
                  <span className={p.balance < 0 ? 'neg' : 'pos'}>{money(p.balance, { hide })}</span>
                </div>
              ))}
            </div>
            <p className="hint">
              “Previsto” usa a média dos últimos meses somada aos compromissos já cadastrados.
              Lançamentos com situação “Previsto” entram no mês da competência.
            </p>
          </Card>

          {selected && (
            <Card
              title={`Composição de ${monthLabel(selected.month, { long: true })}`}
              action={<Pill tone="accent">{selected.mode}</Pill>}
            >
              <div className="list">
                <Row label="Compromissos conhecidos" right={<Amount value={-selected.committed} hide={hide} />} />
                <Row label="Despesa variável estimada" right={<Amount value={-selected.variableEstimate} hide={hide} />}
                  sub="Média histórica descontando o que já está cadastrado." />
                <Row label="Entradas previstas" right={<Amount value={selected.income} hide={hide} tone="up" />} />
              </div>
              {selected.commitments.length > 0 && (
                <div className="list list-scroll">
                  {selected.commitments.map((c) => (
                    <Row key={c.id} label={c.name} sub={`${c.source} · ${dayLabel(c.date)}`}
                      right={<Amount value={-c.amount} hide={hide} />} />
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {view === 'historico' && (
        <>
          <Card title="Receitas e despesas" subtitle="Últimos 12 meses realizados.">
            <FlowChart series={history} hide={hide} />
          </Card>
          <Card title="Resumo por mês">
            <div className="table">
              <div className="thead"><span>Mês</span><span>Receitas</span><span>Despesas</span><span>Resultado</span></div>
              {[...history].reverse().map((h) => (
                <div key={h.month} className="trow">
                  <span className="tmonth">{monthLabel(h.month)}</span>
                  <span className="pos">{money(h.income, { hide })}</span>
                  <span className="neg">{money(h.expense, { hide })}</span>
                  <span className={h.result < 0 ? 'neg' : 'pos'}>{money(h.result, { hide })}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {view === 'patrimonio' && (
        <>
          <Card title="Patrimônio líquido hoje">
            <p className="big-number">{money(nw.total, { hide })}</p>
            <div className="list">
              <Row label="Caixa" right={<Amount value={nw.cash} hide={hide} />} />
              <Row label="Investimentos" right={<Amount value={nw.investments} hide={hide} />} />
              <Row label="Imóveis" right={<Amount value={nw.properties} hide={hide} />} />
              <Row label="Faturas de cartão" right={<Amount value={-nw.cards} hide={hide} />} />
              <Row label="Dívidas e financiamentos" right={<Amount value={-nw.debts} hide={hide} />} />
            </div>
          </Card>
          <Card title="Evolução" subtitle="Gerada a partir das fotografias mensais salvas em Ajustes.">
            {snapshots.length > 1
              ? <NetWorthChart series={snapshots} hide={hide} />
              : <Empty title="Ainda não há histórico" hint="Salve a fotografia do mês em Ajustes para começar a acompanhar a evolução." />}
          </Card>
        </>
      )}
    </div>
  )
}

/* ---------- Transactions ---------- */
const KIND_LABEL = {
  income: 'Receita', expense: 'Despesa', transfer: 'Transferência',
  investment: 'Aporte', card_payment: 'Fatura'
}
const STATUS_LABEL = { planned: 'Previsto', pending: 'Pendente', cleared: 'Liquidado', reconciled: 'Conciliado' }

export function Transactions() {
  const data = useData()
  const look = useLookup()
  const { transactions, accounts, cards, categories, objectives, month, hideValues: hide } = data
  const [filters, setFilters] = useState({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)

  const active = { ...filters, month, search }
  const rows = useMemo(() => applyFilters(transactions, active), [transactions, filters, month, search])
  const flow = useMemo(() => flowForMonth(transactions, month), [transactions, month])

  const grouped = useMemo(() => {
    const map = new Map()
    rows.forEach((t) => {
      const key = t.tx_date
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(t)
    })
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [rows])

  const activeCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="stack">
      <Card>
        <div className="kpis">
          <div><span>Receitas</span><Amount value={flow.income} hide={hide} tone="up" /></div>
          <div><span>Despesas</span><Amount value={flow.expense} hide={hide} tone="down" /></div>
          <div><span>Aportes</span><Amount value={flow.invested} hide={hide} /></div>
          <div><span>Sobra</span><Amount value={flow.cash} hide={hide} signed /></div>
        </div>
      </Card>

      <div className="toolbar">
        <label className="search">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Buscar em ${monthLabel(month, { long: true })}`}
          />
          {search && <button onClick={() => setSearch('')} aria-label="Limpar busca"><X size={14} /></button>}
        </label>
        <Button variant="outline" size="sm" icon={<SlidersHorizontal size={16} />} onClick={() => setFilterOpen(true)}>
          Filtros{activeCount ? ` (${activeCount})` : ''}
        </Button>
        <Button size="sm" icon={<Plus size={16} />} onClick={() => setEditing({})}>Lançar</Button>
      </div>

      {activeCount > 0 && (
        <div className="chips">
          {Object.entries(filters).filter(([, v]) => v).map(([k, v]) => (
            <button key={k} className="chip" onClick={() => setFilters((f) => ({ ...f, [k]: '' }))}>
              {chipLabel(k, v, look)} <X size={13} />
            </button>
          ))}
          <button className="chip chip-clear" onClick={() => setFilters({})}>Limpar tudo</button>
        </div>
      )}

      {grouped.length ? grouped.map(([date, items]) => (
        <Card key={date} title={dayLabel(date)} subtitle={`${items.length} ${items.length === 1 ? 'lançamento' : 'lançamentos'}`}>
          <div className="list">
            {items.map((t) => (
              <Row
                key={t.id}
                onClick={() => setEditing(t)}
                label={t.description}
                badge={t.status !== 'cleared' ? <Pill tone={t.status === 'planned' ? 'neutral' : 'warn'}>{STATUS_LABEL[t.status]}</Pill> : null}
                sub={[
                  KIND_LABEL[t.kind],
                  t.category_id && look.categoryName(t.category_id),
                  t.card_id && look.cardName(t.card_id),
                  t.bank_account_id && look.accountName(t.bank_account_id),
                  t.objective_id && look.objectiveName(t.objective_id)
                ].filter(Boolean).join(' · ')}
                right={<Amount value={t.amount} hide={hide} signed />}
              />
            ))}
          </div>
        </Card>
      )) : (
        <Card>
          <Empty
            title="Nenhum lançamento encontrado"
            hint="Ajuste os filtros, mude o mês no topo ou registre um novo lançamento."
            action={<Button icon={<Plus size={16} />} onClick={() => setEditing({})}>Novo lançamento</Button>}
          />
        </Card>
      )}

      <Sheet
        open={filterOpen}
        title="Filtrar lançamentos"
        onClose={() => setFilterOpen(false)}
        footer={(
          <div className="sheet-actions">
            <Button variant="quiet" onClick={() => setFilters({})}>Limpar</Button>
            <Button onClick={() => setFilterOpen(false)}>Aplicar</Button>
          </div>
        )}
      >
        <div className="form-grid">
          <FilterSelect label="Conta" value={filters.accountId} onChange={(v) => setFilters((f) => ({ ...f, accountId: v }))}
            options={accounts.map((a) => ({ value: a.id, label: a.name }))} />
          <FilterSelect label="Cartão" value={filters.cardId} onChange={(v) => setFilters((f) => ({ ...f, cardId: v }))}
            options={cards.map((c) => ({ value: c.id, label: c.name }))} />
          <FilterSelect label="Categoria" value={filters.categoryId} onChange={(v) => setFilters((f) => ({ ...f, categoryId: v }))}
            options={categories.map((c) => ({ value: c.id, label: c.name }))} />
          <FilterSelect label="Objetivo" value={filters.objectiveId} onChange={(v) => setFilters((f) => ({ ...f, objectiveId: v }))}
            options={objectives.map((o) => ({ value: o.id, label: o.name }))} />
          <FilterSelect label="Tipo" value={filters.kind} onChange={(v) => setFilters((f) => ({ ...f, kind: v }))}
            options={Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label }))} />
          <FilterSelect label="Situação" value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
        </div>
      </Sheet>

      <TransactionSheet open={!!editing} record={editing?.id ? editing : null} onClose={() => setEditing(null)} />
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <Field label={label}>
      <Select value={value || ''} placeholder="Todos" onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
    </Field>
  )
}

function chipLabel(key, value, look) {
  if (key === 'accountId') return look.accountName(value)
  if (key === 'cardId') return look.cardName(value)
  if (key === 'categoryId') return look.categoryName(value)
  if (key === 'objectiveId') return look.objectiveName(value)
  if (key === 'kind') return KIND_LABEL[value] || value
  if (key === 'status') return STATUS_LABEL[value] || value
  return String(value)
}

/* ---------- Accounts ---------- */
const FIELDS = [
  { name: 'name', label: 'Nome da conta', required: true, placeholder: 'Ex.: Itaú corrente' },
  { name: 'bank', label: 'Instituição' },
  {
    name: 'account_type',
    label: 'Tipo',
    type: 'select',
    options: [
      { value: 'corrente', label: 'Conta corrente' },
      { value: 'poupanca', label: 'Poupança' },
      { value: 'pagamento', label: 'Conta de pagamento' },
      { value: 'investimento', label: 'Conta investimento' }
    ]
  },
  { name: 'agency', label: 'Agência' },
  { name: 'account_number', label: 'Conta' },
  { name: 'current_balance', label: 'Saldo atual', type: 'money', hint: 'O valor que aparece no app do banco hoje.' },
  { name: 'initial_balance', label: 'Saldo inicial do razão', type: 'money', hint: 'Ponto de partida para conferir os lançamentos.' },
  { name: 'balance_updated_at', label: 'Saldo conferido em', type: 'date' },
  { name: 'is_reserve', label: 'É reserva', type: 'switch', hint: 'Marque se esta conta guarda a reserva de emergência.' },
  { name: 'archived', label: 'Arquivada', type: 'switch', hint: 'Some das listas sem apagar o histórico.' }
]

export function Accounts() {
  const data = useData()
  const { accounts, transactions, hideValues: hide, save, remove, notify } = data
  const [editing, setEditing] = useState(null)
  const [reconciling, setReconciling] = useState(null)

  const rows = useMemo(() => accountsOverview(accounts, transactions), [accounts, transactions])
  const visible = rows.filter((a) => !a.archived)
  const archived = rows.filter((a) => a.archived)

  return (
    <div className="stack">
      <Card
        title="Caixa total"
        subtitle="Soma dos saldos que você informou."
        action={<Button size="sm" icon={<Plus size={16} />} onClick={() => setEditing({})}>Nova conta</Button>}
      >
        <p className="big-number">{money(totalCash(visible), { hide })}</p>
        {visible.some((a) => Math.abs(a.difference) > 0.005) && (
          <div className="alert alert-warn">
            <Scale size={16} />
            Uma ou mais contas estão com saldo diferente do razão. Concilie para entender a diferença.
          </div>
        )}
      </Card>

      {visible.length ? (
        <div className="grid-2">
          {visible.map((a) => (
            <Card
              key={a.id}
              title={a.name}
              subtitle={[a.bank, a.agency && `Ag. ${a.agency}`, a.account_number].filter(Boolean).join(' · ') || undefined}
              action={a.is_reserve ? <Pill tone="accent">Reserva</Pill> : null}
            >
              <p className="big-number">{money(a.informed, { hide })}</p>
              <div className="list">
                <Row label="Saldo pelo razão" right={<Amount value={a.ledger} hide={hide} />} />
                <Row
                  label="Diferença"
                  right={<Amount value={a.difference} hide={hide} tone={Math.abs(a.difference) > 0.005 ? 'down' : 'flat'} />}
                />
                <Row label="Conferido em" right={<span className="lrow-value">{a.balance_updated_at ? fullDate(a.balance_updated_at) : '—'}</span>} />
              </div>
              <div className="card-actions">
                <Button size="sm" variant="quiet" onClick={() => setEditing(a)}>Editar</Button>
                <Button size="sm" variant="outline" onClick={() => setReconciling(a)}>Conciliar</Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Empty
            title="Nenhuma conta cadastrada"
            hint="Informe o saldo de cada conta para o sistema calcular seu caixa e projetar os próximos meses."
            action={<Button icon={<Plus size={16} />} onClick={() => setEditing({})}>Cadastrar conta</Button>}
          />
        </Card>
      )}

      {archived.length > 0 && (
        <Card title="Arquivadas">
          <div className="list">
            {archived.map((a) => (
              <Row key={a.id} label={a.name} sub={a.bank} onClick={() => setEditing(a)}
                right={<Amount value={a.informed} hide={hide} />} />
            ))}
          </div>
        </Card>
      )}

      <RecordSheet
        open={!!editing}
        title={editing?.id ? 'Editar conta' : 'Nova conta'}
        fields={FIELDS}
        record={editing}
        onClose={() => setEditing(null)}
        onSave={(row) => save('accounts', row)}
        onDelete={(row) => remove('accounts', row.id)}
      />

      <ReconcileSheet
        account={reconciling}
        onClose={() => setReconciling(null)}
        onDone={notify}
      />
    </div>
  )
}

function ReconcileSheet({ account, onClose, onDone }) {
  const { save, hideValues: hide } = useData()
  const [statement, setStatement] = useState('')
  const [busy, setBusy] = useState(false)

  if (!account) return null
  const statementValue = n(statement)
  const difference = statementValue - account.ledger

  async function confirm(createAdjustment) {
    setBusy(true)
    try {
      await save('reconciliations', {
        bank_account_id: account.id,
        reference_date: today(),
        statement_balance: statementValue,
        ledger_balance: account.ledger,
        difference,
        adjusted: createAdjustment
      }, { silent: true })

      if (createAdjustment && Math.abs(difference) > 0.005) {
        await save('transactions', {
          tx_date: today(),
          competence_month: `${today().slice(0, 7)}-01`,
          description: `Ajuste de conciliação · ${account.name}`,
          amount: difference,
          kind: difference > 0 ? 'income' : 'expense',
          bank_account_id: account.id,
          status: 'reconciled',
          source: 'system'
        }, { silent: true })
      }

      await save('accounts', {
        id: account.id,
        current_balance: statementValue,
        balance_updated_at: today()
      }, { silent: true })

      onDone('Conta conciliada.')
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open
      title={`Conciliar ${account.name}`}
      onClose={onClose}
      footer={(
        <div className="sheet-actions">
          <Button variant="quiet" onClick={onClose}>Cancelar</Button>
          <Button variant="outline" busy={busy} onClick={() => confirm(false)}>Só atualizar saldo</Button>
          <Button busy={busy} onClick={() => confirm(true)}>Ajustar e conciliar</Button>
        </div>
      )}
    >
      <div className="form-grid">
        <Field label="Saldo do extrato hoje" wide hint="Copie exatamente o valor que o banco mostra.">
          <MoneyField value={statement} onChange={setStatement} />
        </Field>
        <div className="reconcile-summary">
          <div><span>Saldo pelo razão</span><b>{money(account.ledger, { hide })}</b></div>
          <div><span>Saldo informado</span><b>{money(statementValue, { hide })}</b></div>
          <div className={Math.abs(difference) > 0.005 ? 'diff' : ''}>
            <span>Diferença</span><b>{money(difference, { hide })}</b>
          </div>
        </div>
        <p className="hint field-wide">
          “Ajustar e conciliar” grava um lançamento com a diferença, para o razão bater com o extrato.
          “Só atualizar saldo” corrige o saldo sem criar lançamento.
        </p>
      </div>
    </Sheet>
  )
}

/* ---------- Cards ---------- */
export function Cards() {
  const data = useData()
  const { cards, accounts, transactions, month, hideValues: hide, save, remove } = data
  const [editing, setEditing] = useState(null)

  const fields = useMemo(() => ([
    { name: 'name', label: 'Nome do cartão', required: true, placeholder: 'Ex.: Nubank Ultravioleta' },
    { name: 'institution', label: 'Instituição' },
    { name: 'brand', label: 'Bandeira' },
    { name: 'last_digits', label: 'Final', placeholder: '1234' },
    { name: 'credit_limit', label: 'Limite', type: 'money' },
    { name: 'current_balance', label: 'Fatura em aberto', type: 'money', hint: 'O valor que o app do cartão mostra hoje.' },
    { name: 'closing_day', label: 'Dia do fechamento', type: 'number', step: '1' },
    { name: 'due_day', label: 'Dia do vencimento', type: 'number', step: '1' },
    {
      name: 'bank_account_id',
      label: 'Conta que paga a fatura',
      type: 'select',
      placeholder: 'Nenhuma',
      options: accounts.filter((a) => !a.archived).map((a) => ({ value: a.id, label: a.name }))
    },
    { name: 'archived', label: 'Arquivado', type: 'switch' }
  ]), [accounts])

  const rows = useMemo(() => cardsOverview(cards, transactions), [cards, transactions])
  const visible = rows.filter((c) => !c.archived)

  return (
    <div className="stack">
      <Card
        title="Faturas em aberto"
        subtitle="Total que ainda vai sair do caixa."
        action={<Button size="sm" icon={<Plus size={16} />} onClick={() => setEditing({})}>Novo cartão</Button>}
      >
        <p className="big-number neg">{money(totalCardDebt(visible), { hide })}</p>
      </Card>

      {visible.length ? visible.map((c) => {
        const invoice = cardInvoice(c, transactions, month)
        return (
          <Card
            key={c.id}
            title={c.name}
            subtitle={[c.institution, c.brand, c.last_digits && `final ${c.last_digits}`].filter(Boolean).join(' · ') || undefined}
            action={<Button size="sm" variant="quiet" onClick={() => setEditing(c)}>Editar</Button>}
          >
            <div className="kpis">
              <div><span>Fatura informada</span><Amount value={c.informed} hide={hide} tone="down" /></div>
              <div><span>Pelo razão</span><Amount value={c.ledger} hide={hide} /></div>
              <div><span>Limite livre</span><Amount value={c.available} hide={hide} tone="up" /></div>
              <div><span>Diferença</span><Amount value={c.difference} hide={hide} tone={Math.abs(c.difference) > 0.005 ? 'down' : 'flat'} /></div>
            </div>

            {c.credit_limit > 0 && (
              <div className="limit">
                <ProgressBar value={c.usage} tone={c.usage > 0.8 ? 'risk' : c.usage > 0.5 ? 'warn' : 'accent'} />
                <small>{Math.round(c.usage * 100)}% de {money(c.credit_limit, { hide })}</small>
              </div>
            )}

            <div className="invoice-head">
              <b>Fatura de {monthLabel(month, { long: true })}</b>
              <span>
                fecha {fullDate(invoice.closesOn)} · vence {fullDate(invoice.dueOn)} · {money(invoice.total, { hide })}
              </span>
            </div>

            {invoice.items.length ? (
              <div className="list list-scroll">
                {invoice.items.slice(0, 12).map((t) => (
                  <Row key={t.id} label={t.description} sub={dayLabel(t.tx_date)}
                    right={<Amount value={t.amount} hide={hide} />} />
                ))}
              </div>
            ) : (
              <Empty title="Sem compras neste ciclo" hint="Importe a fatura em Importar extratos ou lance manualmente." />
            )}
          </Card>
        )
      }) : (
        <Card>
          <Empty
            title="Nenhum cartão cadastrado"
            hint="Cadastre cada cartão separadamente para acompanhar limite, fechamento e vencimento."
            action={<Button icon={<Plus size={16} />} onClick={() => setEditing({})}>Cadastrar cartão</Button>}
          />
        </Card>
      )}

      <RecordSheet
        open={!!editing}
        title={editing?.id ? 'Editar cartão' : 'Novo cartão'}
        fields={fields}
        record={editing}
        onClose={() => setEditing(null)}
        onSave={(row) => save('cards', row)}
        onDelete={(row) => remove('cards', row.id)}
      />
    </div>
  )
}

/* ---------- Investments ---------- */
export function Investments() {
  const data = useData()
  const look = useLookup()
  const { investments, objectives, allocations, interest, accounts, hideValues: hide, save, remove, notify } = data
  const [tab, setTab] = useState('objetivos')
  const [editingObjective, setEditingObjective] = useState(null)
  const [editingInvestment, setEditingInvestment] = useState(null)
  const [editingAllocation, setEditingAllocation] = useState(null)
  const [posting, setPosting] = useState(false)

  const overview = useMemo(() => objectivesOverview(objectives, investments, allocations),
    [objectives, investments, allocations])
  const thisMonth = currentMonth()
  const due = useMemo(() => pendingInterest(investments, interest, thisMonth), [investments, interest, thisMonth])

  const contributionByObjective = useMemo(() => {
    const map = {}
    objectives.forEach((o) => { map[o.id] = n(o.monthly_contribution) })
    return map
  }, [objectives])

  const projection = useMemo(
    () => projectInvestments(investments, monthRange(thisMonth, 24), contributionByObjective)
      .map((p) => ({ month: p.month, balance: p.value })),
    [investments, thisMonth, contributionByObjective]
  )

  const objectiveFields = [
    { name: 'name', label: 'Nome do objetivo', required: true, placeholder: 'Ex.: Entrada do apartamento' },
    { name: 'target_amount', label: 'Valor alvo', type: 'money' },
    { name: 'target_date', label: 'Data alvo', type: 'date' },
    { name: 'monthly_contribution', label: 'Aporte mensal planejado', type: 'money' },
    { name: 'priority', label: 'Prioridade', type: 'number', hint: 'Menor número aparece primeiro.' },
    { name: 'description', label: 'Descrição', type: 'textarea' },
    { name: 'archived', label: 'Arquivado', type: 'switch' }
  ]

  const investmentFields = [
    { name: 'name', label: 'Nome', required: true, placeholder: 'Ex.: CDB liquidez diária' },
    {
      name: 'objective_id', label: 'Objetivo', type: 'select', placeholder: 'Sem objetivo',
      options: objectives.filter((o) => !o.archived).map((o) => ({ value: o.id, label: o.name }))
    },
    { name: 'institution', label: 'Instituição' },
    { name: 'product_type', label: 'Produto', placeholder: 'CDB, Tesouro Selic, FII…' },
    { name: 'current_value', label: 'Valor atual', type: 'money', required: true },
    {
      name: 'rate_basis', label: 'Base da taxa', type: 'select', placeholder: null,
      options: [{ value: 'monthly', label: 'Ao mês' }, { value: 'annual', label: 'Ao ano' }]
    },
    { name: 'monthly_rate', label: 'Taxa (%)', type: 'percent', hint: 'Ex.: 0,95 para 0,95% ao mês.' },
    { name: 'liquidity', label: 'Liquidez', placeholder: 'D+0, D+30, no vencimento…' },
    { name: 'target_date', label: 'Vencimento', type: 'date' },
    {
      name: 'bank_account_id', label: 'Conta de origem', type: 'select', placeholder: 'Nenhuma',
      options: accounts.filter((a) => !a.archived).map((a) => ({ value: a.id, label: a.name }))
    },
    { name: 'archived', label: 'Arquivado', type: 'switch' }
  ]

  const allocationFields = [
    {
      name: 'investment_id', label: 'Investimento', type: 'select', required: true, placeholder: 'Escolha',
      options: investments.filter((i) => !i.archived).map((i) => ({ value: i.id, label: i.name }))
    },
    { name: 'amount', label: 'Valor do aporte', type: 'money', required: true },
    { name: 'allocation_date', label: 'Data', type: 'date', required: true },
    {
      name: 'bank_account_id', label: 'Saiu da conta', type: 'select', placeholder: 'Nenhuma',
      options: accounts.filter((a) => !a.archived).map((a) => ({ value: a.id, label: a.name }))
    },
    { name: 'note', label: 'Observação' }
  ]

  /** Lança os juros do mês e atualiza o valor de cada investimento. */
  async function postInterest() {
    setPosting(true)
    try {
      for (const item of due) {
        await save('interest', {
          investment_id: item.investment.id,
          reference_month: monthStart(thisMonth),
          rate: item.rate,
          base_value: item.base,
          interest_amount: item.interest
        }, { silent: true })
        await save('investments', {
          ...item.investment,
          current_value: n(item.investment.current_value) + item.interest,
          last_interest_month: monthStart(thisMonth)
        }, { silent: true })
      }
      notify(`Juros de ${monthLabel(thisMonth, { long: true })} lançados.`)
    } finally {
      setPosting(false)
    }
  }

  /** Aporte também soma ao valor do investimento. */
  async function saveAllocation(row) {
    const inv = investments.find((i) => i.id === row.investment_id)
    const saved = await save('allocations', {
      ...row,
      objective_id: inv?.objective_id || null
    })
    if (inv && !row.id) {
      await save('investments', { ...inv, current_value: n(inv.current_value) + n(row.amount) }, { silent: true })
    }
    return saved
  }

  return (
    <div className="stack">
      <Card
        title="Total investido"
        action={<Button size="sm" icon={<Plus size={16} />} onClick={() => setEditingAllocation({ allocation_date: data.today })}>Aportar</Button>}
      >
        <p className="big-number">{money(totalInvested(investments), { hide })}</p>
        {due.length > 0 && (
          <div className="alert alert-accent">
            <Sparkles size={16} />
            <span>
              {due.length} {due.length === 1 ? 'investimento ainda não teve' : 'investimentos ainda não tiveram'} os
              juros de {monthLabel(thisMonth, { long: true })} lançados
              ({money(due.reduce((s, d) => s + d.interest, 0), { hide })}).
            </span>
            <Button size="sm" busy={posting} onClick={postInterest}>Lançar juros</Button>
          </div>
        )}
      </Card>

      <Card>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'objetivos', label: 'Objetivos' },
            { value: 'produtos', label: 'Produtos' },
            { value: 'aportes', label: 'Aportes' },
            { value: 'projecao', label: 'Projeção' }
          ]}
        />
      </Card>

      {tab === 'objetivos' && (
        <>
          <div className="toolbar toolbar-end">
            <Button size="sm" icon={<Plus size={16} />} onClick={() => setEditingObjective({})}>Novo objetivo</Button>
          </div>
          {overview.filter((o) => !o.archived).length ? overview.filter((o) => !o.archived).map((o) => (
            <Card key={o.id} title={o.name} subtitle={o.description}
              action={<Button size="sm" variant="quiet" onClick={() => setEditingObjective(o)}>Editar</Button>}>
              <div className="kpis">
                <div><span>Acumulado</span><Amount value={o.current} hide={hide} /></div>
                <div><span>Alvo</span><Amount value={o.target} hide={hide} /></div>
                <div><span>Falta</span><Amount value={o.missing} hide={hide} tone="down" /></div>
                <div><span>Aporte necessário</span><Amount value={o.neededMonthly} hide={hide} /></div>
              </div>
              {o.progress != null && <ProgressBar value={o.progress} />}
              <p className="hint">
                {o.target_date ? `Prazo em ${fullDate(o.target_date)} · ${o.monthsLeft} meses restantes · ` : ''}
                rendimento médio {(o.monthlyRate * 100).toFixed(2)}% ao mês
              </p>
              {o.investments.length > 0 && (
                <div className="list">
                  {o.investments.map((i) => (
                    <Row key={i.id} label={i.name} sub={[i.institution, i.product_type].filter(Boolean).join(' · ')}
                      right={<Amount value={i.current_value} hide={hide} />} />
                  ))}
                </div>
              )}
            </Card>
          )) : (
            <Card>
              <Empty title="Nenhum objetivo criado"
                hint="Crie objetivos como reserva, entrada de imóvel ou aposentadoria. Cada aporte fica ligado a um deles."
                action={<Button icon={<Plus size={16} />} onClick={() => setEditingObjective({})}>Criar objetivo</Button>} />
            </Card>
          )}
        </>
      )}

      {tab === 'produtos' && (
        <>
          <div className="toolbar toolbar-end">
            <Button size="sm" icon={<Plus size={16} />} onClick={() => setEditingInvestment({ rate_basis: 'monthly' })}>Novo produto</Button>
          </div>
          <Card>
            {investments.filter((i) => !i.archived).length ? (
              <div className="list">
                {investments.filter((i) => !i.archived).map((i) => (
                  <Row key={i.id} onClick={() => setEditingInvestment(i)} label={i.name}
                    sub={[
                      i.objective_id && look.objectiveName(i.objective_id),
                      i.institution,
                      `${(monthlyRateOf(i) * 100).toFixed(2)}% a.m.`,
                      i.liquidity
                    ].filter(Boolean).join(' · ')}
                    right={<Amount value={i.current_value} hide={hide} />} />
                ))}
              </div>
            ) : <Empty title="Nenhum produto cadastrado" hint="Cadastre cada aplicação com sua taxa para o sistema atualizar os juros todo mês." />}
          </Card>
        </>
      )}

      {tab === 'aportes' && (
        <Card title="Histórico de aportes">
          {allocations.length ? (
            <div className="list">
              {allocations.map((a) => (
                <Row key={a.id} onClick={() => setEditingAllocation(a)}
                  label={look.investmentName(a.investment_id)}
                  sub={[fullDate(a.allocation_date), a.objective_id && look.objectiveName(a.objective_id), a.note]
                    .filter(Boolean).join(' · ')}
                  right={<Amount value={a.amount} hide={hide} tone="up" />} />
              ))}
            </div>
          ) : <Empty title="Nenhum aporte registrado" hint="Registre quanto foi destinado a cada objetivo." />}
        </Card>
      )}

      {tab === 'projecao' && (
        <Card title="Projeção dos investimentos" subtitle="24 meses com juros compostos e os aportes planejados de cada objetivo.">
          {investments.filter((i) => !i.archived).length
            ? <BalanceChart series={projection} hide={hide} />
            : <Empty title="Cadastre um produto para ver a projeção" />}
          <div className="list">
            {[12, 24].map((m) => {
              const point = projection[m - 1]
              return point && (
                <Row key={m} label={`Em ${monthLabel(addMonths(thisMonth, m - 1), { long: true })}`}
                  right={<Amount value={point.balance} hide={hide} />} />
              )
            })}
          </div>
        </Card>
      )}

      <RecordSheet open={!!editingObjective} title={editingObjective?.id ? 'Editar objetivo' : 'Novo objetivo'}
        fields={objectiveFields} record={editingObjective} onClose={() => setEditingObjective(null)}
        onSave={(row) => save('objectives', row)} onDelete={(row) => remove('objectives', row.id)} />

      <RecordSheet open={!!editingInvestment} title={editingInvestment?.id ? 'Editar produto' : 'Novo produto'}
        fields={investmentFields} record={editingInvestment} onClose={() => setEditingInvestment(null)}
        onSave={(row) => save('investments', row)} onDelete={(row) => remove('investments', row.id)} />

      <RecordSheet open={!!editingAllocation} title={editingAllocation?.id ? 'Editar aporte' : 'Novo aporte'}
        fields={allocationFields} record={editingAllocation} onClose={() => setEditingAllocation(null)}
        onSave={saveAllocation} onDelete={(row) => remove('allocations', row.id)} />
    </div>
  )
}

/* ---------- Properties ---------- */
const FREQ = {
  monthly: 'Mensal', quarterly: 'Trimestral', semiannual: 'Semestral',
  annual: 'Anual', once: 'Única'
}

export function Properties() {
  const data = useData()
  const { properties, propertyObligations, liabilities, accounts, categories, hideValues: hide, save, remove } = data
  const [editingProperty, setEditingProperty] = useState(null)
  const [editingObligation, setEditingObligation] = useState(null)
  const [editingLiability, setEditingLiability] = useState(null)

  const reserve = useMemo(() => reservePlan(data), [data])
  const now = currentMonth()

  const propertyFields = [
    { name: 'name', label: 'Nome do imóvel', required: true, placeholder: 'Ex.: Apartamento Centro' },
    { name: 'location', label: 'Localização' },
    { name: 'market_value', label: 'Valor de mercado', type: 'money', hint: 'Entra no cálculo do patrimônio.' },
    { name: 'acquisition_value', label: 'Valor de aquisição', type: 'money' },
    { name: 'notes', label: 'Observações', type: 'textarea' },
    { name: 'archived', label: 'Arquivado', type: 'switch' }
  ]

  const obligationFields = [
    {
      name: 'property_id', label: 'Imóvel', type: 'select', required: true, placeholder: 'Escolha',
      options: properties.filter((p) => !p.archived).map((p) => ({ value: p.id, label: p.name }))
    },
    { name: 'name', label: 'Obrigação', required: true, placeholder: 'IPTU, condomínio, seguro…' },
    { name: 'amount', label: 'Valor', type: 'money', required: true },
    {
      name: 'frequency', label: 'Frequência', type: 'select', placeholder: null,
      options: Object.entries(FREQ).map(([value, label]) => ({ value, label }))
    },
    { name: 'next_due_date', label: 'Próximo vencimento', type: 'date', required: true },
    { name: 'occurrences_left', label: 'Parcelas restantes', type: 'number', hint: 'Deixe vazio se não tiver fim.' },
    { name: 'accumulate', label: 'Reservar por mês', type: 'switch', default: true, hint: 'Divide o valor pelos meses até vencer.' },
    {
      name: 'bank_account_id', label: 'Conta de pagamento', type: 'select', placeholder: 'Nenhuma',
      options: accounts.filter((a) => !a.archived).map((a) => ({ value: a.id, label: a.name }))
    },
    {
      name: 'category_id', label: 'Categoria', type: 'select', placeholder: 'Nenhuma',
      options: categories.filter((c) => c.kind === 'expense').map((c) => ({ value: c.id, label: c.name }))
    },
    { name: 'active', label: 'Ativa', type: 'switch', default: true },
    { name: 'notes', label: 'Observações', type: 'textarea' }
  ]

  const liabilityFields = [
    { name: 'name', label: 'Nome da dívida', required: true, placeholder: 'Ex.: Financiamento Caixa' },
    { name: 'kind', label: 'Tipo', placeholder: 'Financiamento, consignado…' },
    { name: 'current_balance', label: 'Saldo devedor', type: 'money' },
    { name: 'monthly_payment', label: 'Parcela mensal', type: 'money' },
    { name: 'monthly_rate', label: 'Juros ao mês (%)', type: 'percent' },
    { name: 'remaining_months', label: 'Parcelas restantes', type: 'number' },
    { name: 'next_due_date', label: 'Próximo vencimento', type: 'date' },
    {
      name: 'property_id', label: 'Imóvel vinculado', type: 'select', placeholder: 'Nenhum',
      options: properties.map((p) => ({ value: p.id, label: p.name }))
    },
    {
      name: 'bank_account_id', label: 'Conta de débito', type: 'select', placeholder: 'Nenhuma',
      options: accounts.filter((a) => !a.archived).map((a) => ({ value: a.id, label: a.name }))
    },
    { name: 'active', label: 'Ativa', type: 'switch', default: true }
  ]

  const totalValue = properties.filter((p) => !p.archived).reduce((s, p) => s + n(p.market_value), 0)
  const totalDebt = liabilities.filter((l) => l.active !== false).reduce((s, l) => s + n(l.current_balance), 0)

  return (
    <div className="stack">
      <Card title="Imóveis e obrigações">
        <div className="kpis">
          <div><span>Valor dos imóveis</span><Amount value={totalValue} hide={hide} /></div>
          <div><span>Saldo devedor</span><Amount value={totalDebt} hide={hide} tone="down" /></div>
          <div><span>Patrimônio nos imóveis</span><Amount value={totalValue - totalDebt} hide={hide} /></div>
          <div><span>Reservar por mês</span><Amount value={reserve.monthlyTotal} hide={hide} /></div>
        </div>
        <div className="card-actions">
          <Button size="sm" icon={<Plus size={16} />} onClick={() => setEditingProperty({})}>Imóvel</Button>
          <Button size="sm" variant="outline" icon={<Plus size={16} />}
            onClick={() => setEditingObligation({ frequency: 'annual', accumulate: true, active: true })}
            disabled={!properties.length}>Obrigação</Button>
          <Button size="sm" variant="outline" icon={<Plus size={16} />} onClick={() => setEditingLiability({ active: true })}>Dívida</Button>
        </div>
      </Card>

      {properties.filter((p) => !p.archived).map((p) => {
        const obligations = propertyObligations.filter((o) => o.property_id === p.id)
        const debts = liabilities.filter((l) => l.property_id === p.id && l.active !== false)
        const monthlyReserve = reserve.items
          .filter((i) => obligations.some((o) => o.id === i.id))
          .reduce((s, i) => s + i.monthly, 0)
        return (
          <Card key={p.id} title={p.name} subtitle={p.location}
            action={<Button size="sm" variant="quiet" onClick={() => setEditingProperty(p)}>Editar</Button>}>
            <div className="kpis">
              <div><span>Valor</span><Amount value={p.market_value} hide={hide} /></div>
              <div><span>Dívida</span><Amount value={debts.reduce((s, d) => s + n(d.current_balance), 0)} hide={hide} tone="down" /></div>
              <div><span>Guardar por mês</span><Amount value={monthlyReserve} hide={hide} /></div>
            </div>

            {obligations.length ? (
              <div className="list">
                {obligations.map((o) => {
                  const dueKey = o.next_due_date ? monthKey(o.next_due_date) : null
                  const left = dueKey ? Math.max(0, monthsBetween(now, dueKey)) : null
                  const perMonth = o.accumulate !== false && o.frequency !== 'monthly' && left != null
                    ? n(o.amount) / Math.max(1, left + 1)
                    : null
                  return (
                    <Row
                      key={o.id}
                      onClick={() => setEditingObligation(o)}
                      label={o.name}
                      badge={o.active === false ? <Pill tone="neutral">inativa</Pill> : null}
                      sub={[
                        FREQ[o.frequency],
                        o.next_due_date && `vence ${fullDate(o.next_due_date)}`,
                        perMonth != null && `guardar ${money(perMonth, { hide })}/mês`
                      ].filter(Boolean).join(' · ')}
                      right={<Amount value={-n(o.amount)} hide={hide} />}
                    />
                  )
                })}
              </div>
            ) : (
              <Empty title="Sem obrigações cadastradas"
                hint="Cadastre IPTU, condomínio e seguro para o sistema calcular quanto guardar todo mês." />
            )}

            {debts.length > 0 && (
              <div className="list">
                {debts.map((l) => (
                  <Row key={l.id} onClick={() => setEditingLiability(l)} label={l.name}
                    sub={`Parcela ${money(l.monthly_payment, { hide })} · ${l.remaining_months ?? '—'} restantes`}
                    right={<Amount value={-n(l.current_balance)} hide={hide} />} />
                ))}
              </div>
            )}
          </Card>
        )
      })}

      {!properties.filter((p) => !p.archived).length && (
        <Card>
          <Empty title="Nenhum imóvel cadastrado"
            hint="Cadastre seus imóveis e as obrigações de cada um. O sistema divide as contas anuais pelos meses que faltam."
            action={<Button icon={<Plus size={16} />} onClick={() => setEditingProperty({})}>Cadastrar imóvel</Button>} />
        </Card>
      )}

      {liabilities.filter((l) => !l.property_id && l.active !== false).length > 0 && (
        <Card title="Outras dívidas">
          <div className="list">
            {liabilities.filter((l) => !l.property_id && l.active !== false).map((l) => (
              <Row key={l.id} onClick={() => setEditingLiability(l)} label={l.name}
                sub={`${l.kind || 'Dívida'} · parcela ${money(l.monthly_payment, { hide })}`}
                right={<Amount value={-n(l.current_balance)} hide={hide} />} />
            ))}
          </div>
        </Card>
      )}

      <Card title="Plano de reserva" subtitle="Quanto separar por mês para cada obrigação futura.">
        {reserve.items.length ? (
          <div className="list">
            {reserve.items.map((i) => (
              <Row key={i.id} label={i.name}
                sub={i.dueKey ? `${i.context} · ${money(i.amount, { hide })} em ${monthLabel(i.dueKey)}` : i.context}
                right={<Amount value={i.monthly} hide={hide} />} />
            ))}
            <Row label={<b>Total mensal</b>} right={<Amount value={reserve.monthlyTotal} hide={hide} />} />
          </div>
        ) : <Empty title="Nada a reservar por enquanto" />}
      </Card>

      <RecordSheet open={!!editingProperty} title={editingProperty?.id ? 'Editar imóvel' : 'Novo imóvel'}
        fields={propertyFields} record={editingProperty} onClose={() => setEditingProperty(null)}
        onSave={(row) => save('properties', row)} onDelete={(row) => remove('properties', row.id)} />

      <RecordSheet open={!!editingObligation} title={editingObligation?.id ? 'Editar obrigação' : 'Nova obrigação'}
        fields={obligationFields} record={editingObligation} onClose={() => setEditingObligation(null)}
        onSave={(row) => save('propertyObligations', row)} onDelete={(row) => remove('propertyObligations', row.id)} />

      <RecordSheet open={!!editingLiability} title={editingLiability?.id ? 'Editar dívida' : 'Nova dívida'}
        fields={liabilityFields} record={editingLiability} onClose={() => setEditingLiability(null)}
        onSave={(row) => save('liabilities', row)} onDelete={(row) => remove('liabilities', row.id)} />
    </div>
  )
}

/* ---------- Subscriptions ---------- */
const SUB_FREQ = { monthly: 'Mensal', quarterly: 'Trimestral', semiannual: 'Semestral', annual: 'Anual' }
const FACTOR = { monthly: 12, quarterly: 4, semiannual: 2, annual: 1 }

export function Subscriptions() {
  const data = useData()
  const look = useLookup()
  const { subscriptions, cards, accounts, categories, hideValues: hide, save, remove } = data
  const [editing, setEditing] = useState(null)

  const fields = [
    { name: 'name', label: 'Assinatura', required: true, placeholder: 'Ex.: Netflix' },
    { name: 'monthly_amount', label: 'Valor por cobrança', type: 'money', required: true },
    {
      name: 'frequency', label: 'Frequência', type: 'select', placeholder: null,
      options: Object.entries(SUB_FREQ).map(([value, label]) => ({ value, label }))
    },
    { name: 'billing_day', label: 'Dia da cobrança', type: 'number', step: '1' },
    { name: 'next_billing_date', label: 'Próxima cobrança', type: 'date' },
    {
      name: 'card_id', label: 'Cartão', type: 'select', placeholder: 'Nenhum',
      options: cards.filter((c) => !c.archived).map((c) => ({ value: c.id, label: c.name }))
    },
    {
      name: 'bank_account_id', label: 'Conta', type: 'select', placeholder: 'Nenhuma',
      options: accounts.filter((a) => !a.archived).map((a) => ({ value: a.id, label: a.name }))
    },
    {
      name: 'category_id', label: 'Categoria', type: 'select', placeholder: 'Nenhuma',
      options: categories.filter((c) => c.kind === 'expense').map((c) => ({ value: c.id, label: c.name }))
    },
    { name: 'started_on', label: 'Assinada em', type: 'date' },
    { name: 'active', label: 'Ativa', type: 'switch', default: true },
    { name: 'notes', label: 'Observações', type: 'textarea' }
  ]

  const active = subscriptions.filter((s) => s.active !== false)
  const monthly = useMemo(
    () => active.reduce((s, x) => s + (n(x.monthly_amount) * (FACTOR[x.frequency || 'monthly'] || 12)) / 12, 0),
    [active]
  )

  return (
    <div className="stack">
      <Card
        title="Custo recorrente"
        subtitle="Média mensal de todas as assinaturas ativas."
        action={<Button size="sm" icon={<Plus size={16} />} onClick={() => setEditing({ frequency: 'monthly', active: true })}>Nova</Button>}
      >
        <p className="big-number neg">{money(monthly, { hide })}</p>
        <p className="hint">{money(monthly * 12, { hide })} por ano em {active.length} assinaturas.</p>
      </Card>

      <Card title="Assinaturas">
        {subscriptions.length ? (
          <div className="list">
            {subscriptions.map((s) => (
              <Row
                key={s.id}
                onClick={() => setEditing(s)}
                label={s.name}
                badge={s.active === false ? <Pill tone="neutral">cancelada</Pill> : null}
                sub={[
                  SUB_FREQ[s.frequency || 'monthly'],
                  s.billing_day && `dia ${s.billing_day}`,
                  s.next_billing_date && `próxima ${fullDate(s.next_billing_date)}`,
                  s.card_id && look.cardName(s.card_id),
                  s.bank_account_id && look.accountName(s.bank_account_id)
                ].filter(Boolean).join(' · ')}
                right={<Amount value={-n(s.monthly_amount)} hide={hide} />}
              />
            ))}
          </div>
        ) : (
          <Empty
            title="Nenhuma assinatura cadastrada"
            hint="Cadastre streaming, softwares e mensalidades. Elas entram automaticamente na previsão de caixa."
            action={<Button icon={<Plus size={16} />} onClick={() => setEditing({ frequency: 'monthly', active: true })}>Cadastrar</Button>}
          />
        )}
      </Card>

      <RecordSheet
        open={!!editing}
        title={editing?.id ? 'Editar assinatura' : 'Nova assinatura'}
        fields={fields}
        record={editing}
        onClose={() => setEditing(null)}
        onSave={(row) => save('subscriptions', row)}
        onDelete={(row) => remove('subscriptions', row.id)}
      />
    </div>
  )
}

/* ---------- CostsPage ---------- */
/**
 * Saúde e custos de capital compartilham a mesma estrutura:
 * um valor, um mês de competência e um estado de pago.
 */
export function CostsPage({ storeKey, title, intro, extraFields = [], emptyHint }) {
  const data = useData()
  const look = useLookup()
  const { month, hideValues: hide, accounts, categories, save, remove } = data
  const rows = data[storeKey] || []
  const [editing, setEditing] = useState(null)

  const fields = [
    { name: 'description', label: 'Descrição', required: true, wide: true },
    { name: 'amount', label: 'Valor', type: 'money', required: true },
    { name: 'reference_month', label: 'Mês de competência', type: 'month', required: true },
    { name: 'due_date', label: 'Vencimento', type: 'date' },
    ...extraFields,
    {
      name: 'category_id', label: 'Categoria', type: 'select', placeholder: 'Nenhuma',
      options: categories.filter((c) => c.kind === 'expense').map((c) => ({ value: c.id, label: c.name }))
    },
    {
      name: 'bank_account_id', label: 'Conta', type: 'select', placeholder: 'Nenhuma',
      options: accounts.filter((a) => !a.archived).map((a) => ({ value: a.id, label: a.name }))
    },
    { name: 'recurring', label: 'Recorrente', type: 'switch', hint: 'Repete todo mês.' },
    { name: 'paid', label: 'Pago', type: 'switch' }
  ]

  const ofMonth = useMemo(() => rows.filter((r) => monthKey(r.reference_month) === month), [rows, month])
  const total = ofMonth.reduce((s, r) => s + n(r.amount), 0)
  const open = ofMonth.filter((r) => !r.paid).reduce((s, r) => s + n(r.amount), 0)
  const yearTotal = rows
    .filter((r) => String(r.reference_month).slice(0, 4) === month.slice(0, 4))
    .reduce((s, r) => s + n(r.amount), 0)

  return (
    <div className="stack">
      <Card
        title={title}
        subtitle={intro}
        action={(
          <Button size="sm" icon={<Plus size={16} />}
            onClick={() => setEditing({ reference_month: monthStart(month) })}>Novo</Button>
        )}
      >
        <div className="kpis">
          <div><span>{monthLabel(month)}</span><Amount value={total} hide={hide} /></div>
          <div><span>Em aberto</span><Amount value={open} hide={hide} tone={open > 0 ? 'down' : 'flat'} /></div>
          <div><span>Ano de {month.slice(0, 4)}</span><Amount value={yearTotal} hide={hide} /></div>
        </div>
      </Card>

      <Card title={`Lançamentos de ${monthLabel(month, { long: true })}`}>
        {ofMonth.length ? (
          <div className="list">
            {ofMonth.map((r) => (
              <Row
                key={r.id}
                label={r.description}
                badge={r.paid ? <Pill tone="accent">pago</Pill> : null}
                sub={[
                  r.provider,
                  r.due_date && `vence ${fullDate(r.due_date)}`,
                  r.rate ? `${(n(r.rate) * 100).toFixed(2)}% a.m.` : null,
                  r.category_id && look.categoryName(r.category_id)
                ].filter(Boolean).join(' · ')}
                right={(
                  <span className="row-actions">
                    <Amount value={-n(r.amount)} hide={hide} />
                    <IconButton
                      label={r.paid ? 'Marcar como não pago' : 'Marcar como pago'}
                      onClick={() => save(storeKey, { ...r, paid: !r.paid }, { silent: true })}
                    >
                      {r.paid ? <Undo2 size={15} /> : <Check size={15} />}
                    </IconButton>
                    <button className="link" onClick={() => setEditing(r)}>editar</button>
                  </span>
                )}
              />
            ))}
          </div>
        ) : (
          <Empty
            title={`Nada em ${monthLabel(month, { long: true })}`}
            hint={emptyHint}
            action={(
              <Button icon={<Plus size={16} />} onClick={() => setEditing({ reference_month: monthStart(month) })}>
                Adicionar
              </Button>
            )}
          />
        )}
      </Card>

      {rows.length > ofMonth.length && (
        <Card title="Meses anteriores">
          <div className="list list-scroll">
            {rows.filter((r) => monthKey(r.reference_month) !== month).slice(0, 20).map((r) => (
              <Row key={r.id} onClick={() => setEditing(r)} label={r.description}
                sub={`${monthLabel(monthKey(r.reference_month), { long: true })}${r.paid ? ' · pago' : ' · em aberto'}`}
                right={<Amount value={-n(r.amount)} hide={hide} />} />
            ))}
          </div>
        </Card>
      )}

      <RecordSheet
        open={!!editing}
        title={editing?.id ? 'Editar lançamento' : 'Novo lançamento'}
        fields={fields}
        record={editing}
        onClose={() => setEditing(null)}
        onSave={(row) => save(storeKey, row)}
        onDelete={(row) => remove(storeKey, row.id)}
      />
    </div>
  )
}

/* ---------- Health ---------- */
export function Health() {
  return (
    <CostsPage
      storeKey="healthCosts"
      title="Saúde"
      intro="Plano, consultas, exames e medicamentos, separados do resto das despesas."
      emptyHint="Registre o plano de saúde, consultas e exames para acompanhar o custo real por mês."
      extraFields={[{ name: 'provider', label: 'Prestador', placeholder: 'Unimed, laboratório, clínica…' }]}
    />
  )
}

/* ---------- Capital ---------- */
export function Capital() {
  return (
    <CostsPage
      storeKey="capitalCosts"
      title="Custos de capital"
      intro="Juros, tarifas, IOF e impostos — o preço de usar dinheiro de terceiros."
      emptyHint="Registre juros de cartão, tarifas bancárias, IOF e antecipações para ver quanto o crédito custa por mês."
      extraFields={[{ name: 'rate', label: 'Taxa ao mês (%)', type: 'percent', hint: 'Opcional, para comparar operações.' }]}
    />
  )
}

/* ---------- Import ---------- */
const IMPORT_KIND = {
  income: 'Receita', expense: 'Despesa', transfer: 'Transferência',
  investment: 'Aporte', card_payment: 'Fatura'
}

export function Import() {
  const data = useData()
  const look = useLookup()
  const {
    accounts, cards, categories, transactions, importRules, importBatches,
    hideValues: hide, save, saveMany, remove, notify
  } = data

  const fileRef = useRef(null)
  const [target, setTarget] = useState({ type: 'account', id: '' })
  const [parsed, setParsed] = useState(null)
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)
  const [lendo, setLendo] = useState(false)
  const [pdfPendente, setPdfPendente] = useState(null)
  const [senhaPdf, setSenhaPdf] = useState('')
  const [editingRule, setEditingRule] = useState(null)
  const [tab, setTab] = useState('importar')

  const existingPrints = useMemo(
    () => new Set(transactions.map((t) => t.fingerprint).filter(Boolean)),
    [transactions]
  )

  async function handleFile(file, senha = '') {
    if (!file) return
    if (!target.id) { notify('Escolha primeiro a conta ou o cartão de destino.', 'error'); return }

    let result
    setLendo(true)
    try {
      const cartao = target.type === 'card' ? cards.find((c) => c.id === target.id) : null
      result = await readStatementFile(file, {
        password: senha,
        closingMonth: cartao?.closing_day ? new Date().getMonth() + 1 : undefined
      })
    } catch (e) {
      setLendo(false)
      if (e?.code === 'SENHA') {
        // Faturas costumam vir protegidas pelos primeiros dígitos do CPF.
        setPdfPendente(file)
        return
      }
      notify(friendlyError(e), 'error')
      return
    } finally {
      setLendo(false)
    }
    setPdfPendente(null)
    setSenhaPdf('')
    const prepared = withOccurrenceIndex(result.rows).map((row) => {
      const guess = categorize(row, { rules: importRules, categories })
      const print = fingerprint({
        target: target.id,
        date: row.date,
        amount: row.amount,
        description: row.description,
        externalId: row.externalId,
        index: row.occurrence
      })
      return {
        ...row,
        ...guess,
        fingerprint: print,
        duplicate: existingPrints.has(print),
        include: !existingPrints.has(print)
      }
    })
    setParsed({ ...result, fileName: file.name })
    setRows(prepared)
    if (result.warnings?.length) notify(result.warnings[0], 'error')
  }

  const selected = rows.filter((r) => r.include)
  const duplicates = rows.filter((r) => r.duplicate)
  const uncategorized = selected.filter((r) => !r.category_id && r.kind !== 'transfer')

  async function commit() {
    if (!selected.length) return
    setBusy(true)
    try {
      const batch = await save('importBatches', {
        file_name: parsed.fileName,
        file_type: parsed.fileType,
        bank_account_id: target.type === 'account' ? target.id : null,
        card_id: target.type === 'card' ? target.id : null,
        rows_read: rows.length,
        rows_imported: selected.length,
        rows_skipped: rows.length - selected.length,
        period_start: rows.reduce((min, r) => (!min || r.date < min ? r.date : min), null),
        period_end: rows.reduce((max, r) => (!max || r.date > max ? r.date : max), null)
      }, { silent: true })

      await saveMany('transactions', selected.map((r) => ({
        tx_date: r.date,
        competence_month: monthStart(r.date.slice(0, 7)),
        description: r.description,
        amount: r.kind === 'income' ? Math.abs(r.amount) : -Math.abs(r.amount),
        kind: r.kind,
        category_id: r.category_id || null,
        bank_account_id: target.type === 'account' ? target.id : null,
        card_id: target.type === 'card' ? target.id : null,
        status: 'cleared',
        source: 'import',
        import_batch_id: batch.id,
        installment_no: r.installment_no || null,
        installment_total: r.installment_total || null,
        fingerprint: r.fingerprint
      })))

      notify(`${selected.length} lançamentos importados.`)
      setParsed(null)
      setRows([])
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      // o erro já é mostrado pelo provider
    } finally {
      setBusy(false)
    }
  }

  const ruleFields = [
    { name: 'pattern', label: 'Texto do extrato', required: true, wide: true, placeholder: 'Ex.: SUPERMERCADO SAO' },
    {
      name: 'match_type', label: 'Comparação', type: 'select', placeholder: null,
      options: [
        { value: 'contains', label: 'Contém' },
        { value: 'starts', label: 'Começa com' },
        { value: 'regex', label: 'Expressão regular' }
      ]
    },
    {
      name: 'category_id', label: 'Categoria', type: 'select', placeholder: 'Nenhuma',
      options: categories.map((c) => ({ value: c.id, label: `${c.name} (${c.kind === 'income' ? 'receita' : 'despesa'})` }))
    },
    {
      name: 'set_kind', label: 'Forçar tipo', type: 'select', placeholder: 'Automático',
      options: Object.entries(IMPORT_KIND).map(([value, label]) => ({ value, label }))
    },
    { name: 'rename_to', label: 'Renomear para', placeholder: 'Opcional' },
    { name: 'priority', label: 'Prioridade', type: 'number', hint: 'Menor número é avaliado primeiro.' },
    { name: 'active', label: 'Ativa', type: 'switch', default: true }
  ]

  return (
    <div className="stack">
      <Card>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'importar', label: 'Importar' },
            { value: 'regras', label: 'Regras' },
            { value: 'historico', label: 'Histórico' }
          ]}
        />
      </Card>

      {tab === 'importar' && (
        <>
          <Card title="Importar extrato" subtitle="Aceita CSV do internet banking e arquivos OFX.">
            <div className="form-grid">
              <Field label="Destino">
                <Select value={target.type} onChange={(e) => setTarget({ type: e.target.value, id: '' })}>
                  <option value="account">Conta bancária</option>
                  <option value="card">Cartão de crédito</option>
                </Select>
              </Field>
              <Field label={target.type === 'account' ? 'Conta' : 'Cartão'}>
                <Select value={target.id} placeholder="Escolha" onChange={(e) => setTarget((t) => ({ ...t, id: e.target.value }))}>
                  {(target.type === 'account' ? accounts : cards)
                    .filter((x) => !x.archived)
                    .map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </Select>
              </Field>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,.ofx,.pdf"
              className="file-input"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Button variant="outline" busy={lendo} icon={<FileUp size={16} />}
              onClick={() => fileRef.current?.click()}>
              {lendo ? 'Lendo o arquivo…' : 'Escolher arquivo'}
            </Button>

            {pdfPendente && (
              <div className="alert alert-warn">
                <TriangleAlert size={16} />
                <span>
                  Esta fatura está protegida por senha. Nos cartões brasileiros costuma ser
                  os primeiros dígitos do seu CPF, ou a data de nascimento.
                </span>
                <div className="pdf-senha">
                  <Input
                    type="password"
                    value={senhaPdf}
                    placeholder="Senha do PDF"
                    onChange={(e) => setSenhaPdf(e.target.value)}
                  />
                  <Button size="sm" busy={lendo} disabled={!senhaPdf}
                    onClick={() => handleFile(pdfPendente, senhaPdf)}>
                    Abrir
                  </Button>
                  <Button size="sm" variant="quiet"
                    onClick={() => { setPdfPendente(null); setSenhaPdf('') }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
            <p className="hint">
              Aceita CSV e OFX do internet banking, e a fatura do cartão em PDF. O arquivo é lido
              dentro do seu navegador — nem o PDF nem a senha dele saem do aparelho. Só os
              lançamentos que você confirmar vão para o seu banco de dados.
            </p>
          </Card>

          {parsed && (
            <Card
              title={`${rows.length} linhas lidas`}
              subtitle={parsed.fileName}
              action={<Button busy={busy} disabled={!selected.length} onClick={commit}>Importar {selected.length}</Button>}
            >
              {duplicates.length > 0 && (
                <div className="alert alert-warn">
                  <TriangleAlert size={16} />
                  {duplicates.length} {duplicates.length === 1 ? 'linha já existe' : 'linhas já existem'} e vieram
                  desmarcadas.
                </div>
              )}
              {parsed.summary?.total != null && (() => {
                const somaLida = rows
                  .filter((r) => r.amount < 0)
                  .reduce((acc, r) => acc + Math.abs(r.amount), 0)
                const diferenca = parsed.summary.total - somaLida
                const bate = Math.abs(diferenca) < 0.05
                return (
                  <div className={`alert ${bate ? 'alert-accent' : 'alert-warn'}`}>
                    {bate ? <Check size={16} /> : <TriangleAlert size={16} />}
                    <span>
                      A fatura declara {money(parsed.summary.total, { hide })} e as linhas lidas
                      somam {money(somaLida, { hide })}.
                      {bate
                        ? ' Confere.'
                        : ` Faltam ${money(Math.abs(diferenca), { hide })} — role a lista e confira se alguma linha ficou de fora.`}
                    </span>
                  </div>
                )
              })()}

              {uncategorized.length > 0 && (
                <div className="alert alert-neutral">
                  {uncategorized.length} sem categoria. Escolha na lista abaixo ou crie uma regra para não repetir o
                  trabalho no próximo extrato.
                </div>
              )}

              <div className="import-list">
                {rows.map((r, i) => (
                  <div key={r.fingerprint} className={`import-row ${r.include ? '' : 'off'}`}>
                    <input
                      type="checkbox"
                      checked={r.include}
                      onChange={(e) => setRows((prev) => prev.map((x, j) => (j === i ? { ...x, include: e.target.checked } : x)))}
                      aria-label={`Incluir ${r.description}`}
                    />
                    <div className="import-main">
                      <b>{r.description}</b>
                      <small>
                        {fullDate(r.date)}
                        {r.duplicate && <> · <span className="warn">já importado</span></>}
                        {r.suggested && <> · sugerido</>}
                      </small>
                      <div className="import-controls">
                        <Select
                          value={r.kind}
                          onChange={(e) => setRows((prev) => prev.map((x, j) => (j === i ? { ...x, kind: e.target.value } : x)))}
                        >
                          {Object.entries(IMPORT_KIND).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </Select>
                        <Select
                          value={r.category_id || ''}
                          placeholder="Sem categoria"
                          onChange={(e) => setRows((prev) => prev.map((x, j) => (j === i ? { ...x, category_id: e.target.value } : x)))}
                        >
                          {categories
                            .filter((c) => c.kind === (r.kind === 'income' ? 'income' : 'expense'))
                            .map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </Select>
                        <button
                          className="link"
                          onClick={() => setEditingRule({
                            pattern: suggestPattern(r.description),
                            match_type: 'contains',
                            category_id: r.category_id || '',
                            priority: 50,
                            active: true
                          })}
                        >
                          criar regra
                        </button>
                      </div>
                    </div>
                    <Amount value={r.amount} hide={hide} signed />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {tab === 'regras' && (
        <Card
          title="Regras de categorização"
          subtitle="Aplicadas automaticamente a cada importação, na ordem de prioridade."
          action={<Button size="sm" onClick={() => setEditingRule({ match_type: 'contains', priority: 100, active: true })}>Nova regra</Button>}
        >
          {importRules.length ? (
            <div className="list">
              {importRules.map((r) => (
                <Row
                  key={r.id}
                  onClick={() => setEditingRule(r)}
                  label={r.pattern}
                  badge={r.active === false ? <Pill tone="neutral">inativa</Pill> : null}
                  sub={[
                    r.match_type === 'starts' ? 'começa com' : r.match_type === 'regex' ? 'regex' : 'contém',
                    r.category_id && look.categoryName(r.category_id),
                    r.set_kind && IMPORT_KIND[r.set_kind],
                    `prioridade ${r.priority}`
                  ].filter(Boolean).join(' · ')}
                  right={<span className="lrow-value">{r.hits || 0} usos</span>}
                />
              ))}
            </div>
          ) : (
            <Empty
              title="Nenhuma regra própria"
              hint="Sem regras, o sistema usa uma lista de palavras conhecidas (mercados, farmácias, streaming). Crie regras para os seus estabelecimentos recorrentes."
            />
          )}
        </Card>
      )}

      {tab === 'historico' && (
        <Card title="Importações anteriores">
          {importBatches.length ? (
            <div className="list">
              {importBatches.map((b) => (
                <Row
                  key={b.id}
                  label={b.file_name || 'Arquivo sem nome'}
                  sub={[
                    b.file_type?.toUpperCase(),
                    b.bank_account_id && look.accountName(b.bank_account_id),
                    b.card_id && look.cardName(b.card_id),
                    b.period_start && `${fullDate(b.period_start)} a ${fullDate(b.period_end)}`
                  ].filter(Boolean).join(' · ')}
                  right={(
                    <span className="row-actions">
                      <span className="lrow-value">{b.rows_imported} importados</span>
                      <button className="link" onClick={() => remove('importBatches', b.id)} aria-label="Excluir registro">
                        <Trash2 size={15} />
                      </button>
                    </span>
                  )}
                />
              ))}
            </div>
          ) : (
            <Empty title="Nenhuma importação ainda" hint="O histórico guarda o arquivo, o período e quantas linhas entraram." />
          )}
        </Card>
      )}

      <RecordSheet
        open={!!editingRule}
        title={editingRule?.id ? 'Editar regra' : 'Nova regra'}
        fields={ruleFields}
        record={editingRule}
        onClose={() => setEditingRule(null)}
        onSave={async (row) => {
          const saved = await save('importRules', row)
          setRows((prev) => prev.map((r) => {
            const guess = categorize(r, { rules: [saved, ...importRules], categories })
            return { ...r, ...guess }
          }))
          return saved
        }}
        onDelete={(row) => remove('importRules', row.id)}
      />
    </div>
  )
}

/* ---------- Settings ---------- */
export function Settings() {
  const { session, signOut } = useAuth()
  const data = useData()
  const { settings, categories, snapshots, hideValues: hide, updateSettings, save, remove, notify } = data
  const [reserveTarget, setReserveTarget] = useState(settings?.emergency_reserve_target ?? '')
  const [savingSnapshot, setSavingSnapshot] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)

  const nw = useMemo(() => netWorth(data), [data])
  const month = currentMonth()
  const alreadySaved = snapshots.some((s) => String(s.reference_month).slice(0, 7) === month)

  const grouped = useMemo(() => {
    const map = new Map()
    categories.forEach((c) => {
      const key = c.group_name || 'Sem grupo'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(c)
    })
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [categories])

  const categoryFields = [
    { name: 'name', label: 'Nome', required: true },
    {
      name: 'kind', label: 'Tipo', type: 'select', placeholder: null,
      options: [
        { value: 'expense', label: 'Despesa' },
        { value: 'income', label: 'Receita' },
        { value: 'transfer', label: 'Transferência' }
      ]
    },
    { name: 'group_name', label: 'Grupo', placeholder: 'Fixas, Variáveis, Saúde…' },
    { name: 'is_fixed', label: 'Gasto fixo', type: 'switch' },
    { name: 'archived', label: 'Arquivada', type: 'switch' }
  ]

  async function saveSnapshot() {
    setSavingSnapshot(true)
    try {
      const existing = snapshots.find((s) => String(s.reference_month).slice(0, 7) === month)
      await save('snapshots', {
        ...(existing || {}),
        reference_month: monthStart(month),
        cash: nw.cash,
        investments: nw.investments,
        properties: nw.properties,
        cards: nw.cards,
        liabilities: nw.debts,
        net_worth: nw.total
      }, { silent: true })
      notify(`Fotografia de ${monthLabel(month, { long: true })} salva.`)
    } finally {
      setSavingSnapshot(false)
    }
  }

  return (
    <div className="stack">
      <Card title="Reserva e projeção">
        <div className="form-grid">
          <Field label="Meta de reserva de emergência" hint="Aparece como barra de progresso no painel.">
            <MoneyField value={reserveTarget} onChange={setReserveTarget} />
          </Field>
          <Field label="Meses de projeção">
            <Select
              value={settings?.projection_months ?? 12}
              onChange={(e) => updateSettings({ projection_months: Number(e.target.value) })}
            >
              {[6, 12, 18, 24, 36].map((m) => <option key={m} value={m}>{m} meses</option>)}
            </Select>
          </Field>
        </div>
        <div className="card-actions">
          <Button onClick={() => updateSettings({ emergency_reserve_target: n(reserveTarget) }).then(() => notify('Preferências salvas.'))}>
            Salvar preferências
          </Button>
        </div>
        <Switch
          label="Ocultar valores por padrão"
          checked={!!settings?.hide_values}
          onChange={(v) => updateSettings({ hide_values: v })}
        />
      </Card>

      <Card
        title="Fotografia do patrimônio"
        subtitle="Grave o retrato de hoje para acompanhar a evolução ao longo do tempo."
        action={(
          <Button size="sm" icon={<Camera size={16} />} busy={savingSnapshot} onClick={saveSnapshot}>
            {alreadySaved ? 'Atualizar mês' : 'Salvar mês'}
          </Button>
        )}
      >
        <div className="kpis">
          <div><span>Patrimônio líquido</span><Amount value={nw.total} hide={hide} /></div>
          <div><span>Bens</span><Amount value={nw.assets} hide={hide} /></div>
          <div><span>Obrigações</span><Amount value={nw.liabilities} hide={hide} tone="down" /></div>
        </div>
        {snapshots.length ? (
          <div className="list list-scroll">
            {snapshots.map((s) => (
              <Row
                key={s.id}
                label={monthLabel(String(s.reference_month).slice(0, 7), { long: true })}
                sub={`Caixa ${money(s.cash, { hide })} · Investido ${money(s.investments, { hide })}`}
                right={(
                  <span className="row-actions">
                    <Amount value={s.net_worth} hide={hide} />
                    <button className="link" onClick={() => remove('snapshots', s.id)}>excluir</button>
                  </span>
                )}
              />
            ))}
          </div>
        ) : <Empty title="Nenhuma fotografia salva" hint="Salve uma por mês para montar o gráfico de evolução." />}
      </Card>

      <Card
        title="Categorias"
        subtitle={`${categories.length} cadastradas`}
        action={<Button size="sm" icon={<Plus size={16} />} onClick={() => setEditingCategory({ kind: 'expense' })}>Nova</Button>}
      >
        {grouped.map(([group, items]) => (
          <div key={group} className="category-group">
            <h4>{group}</h4>
            <div className="chips">
              {items.map((c) => (
                <button key={c.id} className={`chip ${c.archived ? 'chip-off' : ''}`} onClick={() => setEditingCategory(c)}>
                  {c.name}
                  {c.kind === 'income' && <i className="chip-mark">receita</i>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </Card>

      <Card title="Conta e segurança">
        <div className="list">
          <Row label="E-mail" right={<span className="lrow-value">{session?.user?.email}</span>} />
          <Row label="Proteção dos dados" right={<Pill tone="accent">RLS ativo</Pill>}
            sub="Cada registro é gravado com o seu identificador e o Postgres bloqueia leituras de outros usuários." />
        </div>
        <div className="alert alert-neutral">
          <ShieldCheck size={16} />
          Este site usa apenas a chave pública (anon) do Supabase. A chave service_role nunca deve ser colocada no
          frontend nem no repositório.
        </div>
        <div className="card-actions">
          <Button variant="outline" onClick={signOut}>Sair da conta</Button>
        </div>
      </Card>

      <RecordSheet
        open={!!editingCategory}
        title={editingCategory?.id ? 'Editar categoria' : 'Nova categoria'}
        fields={categoryFields}
        record={editingCategory}
        onClose={() => setEditingCategory(null)}
        onSave={(row) => save('categories', row)}
        onDelete={(row) => remove('categories', row.id)}
      />
    </div>
  )
}

/* ---------- Profile ---------- */
export function Profile() {
  const { session, signOut } = useAuth()
  const { profile, updateProfile, notify, ...data } = useData()
  const hide = data.hideValues

  const [form, setForm] = useState({})
  const [foto, setFoto] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [senhaAberta, setSenhaAberta] = useState(false)
  const arquivoRef = useRef(null)

  useEffect(() => { setForm(profile || {}) }, [profile])

  useEffect(() => {
    let vivo = true
    if (!profile?.avatar_url) { setFoto(null); return }
    avatarUrl(profile.avatar_url).then((u) => { if (vivo) setFoto(u) })
    return () => { vivo = false }
  }, [profile?.avatar_url])

  const uid = session?.user?.id
  const email = session?.user?.email
  const desde = session?.user?.created_at
  const alterado = JSON.stringify(form) !== JSON.stringify(profile || {})

  async function escolherFoto(file) {
    if (!file) return
    setEnviando(true)
    try {
      const caminho = await uploadAvatar(uid, file)
      await updateProfile({ avatar_url: caminho })
      notify('Foto atualizada.')
    } catch (e) {
      notify(friendlyError(e), 'error')
    } finally {
      setEnviando(false)
      if (arquivoRef.current) arquivoRef.current.value = ''
    }
  }

  async function tirarFoto() {
    setEnviando(true)
    try {
      await removeAvatar(uid, profile?.avatar_url)
      await updateProfile({ avatar_url: null })
      setFoto(null)
      notify('Foto removida.')
    } catch (e) {
      notify(friendlyError(e), 'error')
    } finally {
      setEnviando(false)
    }
  }

  async function salvar() {
    setSalvando(true)
    try {
      await updateProfile({
        full_name: form.full_name || null,
        phone: form.phone || null,
        birth_date: form.birth_date || null,
        city: form.city || null,
        occupation: form.occupation || null,
        monthly_income: form.monthly_income === '' ? null : form.monthly_income
      })
      notify('Perfil salvo.')
    } catch (e) {
      notify(friendlyError(e), 'error')
    } finally {
      setSalvando(false)
    }
  }

  const nome = form.full_name || email?.split('@')[0] || 'Você'
  const totalContas = (data.accounts || []).filter((a) => !a.archived).length
  const totalLancamentos = (data.transactions || []).length
  const patrimonio = netWorth(data)

  return (
    <div className="stack">
      <Card>
        <div className="profile-head">
          <div className="avatar-wrap">
            {foto
              ? <img className="avatar" src={foto} alt={nome} />
              : <div className="avatar avatar-empty">{initials(nome)}</div>}
            <button
              className="avatar-edit"
              onClick={() => arquivoRef.current?.click()}
              disabled={enviando}
              aria-label="Trocar foto"
            >
              <Camera size={15} />
            </button>
          </div>

          <div className="profile-id">
            <h2>{nome}</h2>
            <p className="lrow-sub">{email}</p>
            {desde && <p className="hint">No Meu Financeiro desde {fullDate(desde)}</p>}
          </div>
        </div>

        <input
          ref={arquivoRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="file-input"
          onChange={(e) => escolherFoto(e.target.files?.[0])}
        />

        <div className="card-actions">
          <Button size="sm" variant="outline" busy={enviando} icon={<Camera size={16} />}
            onClick={() => arquivoRef.current?.click()}>
            {foto ? 'Trocar foto' : 'Adicionar foto'}
          </Button>
          {foto && (
            <Button size="sm" variant="quiet" onClick={tirarFoto} disabled={enviando}>Remover</Button>
          )}
        </div>
        <p className="hint">JPG, PNG ou WEBP, até 2 MB. A imagem fica num espaço privado e só você a enxerga.</p>
      </Card>

      <Card title="Seus dados" subtitle="Nada aqui é obrigatório.">
        <div className="form-grid">
          <Field label="Nome completo" wide>
            <Input value={form.full_name || ''} placeholder="Como você quer ser chamado"
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          </Field>
          <Field label="Telefone">
            <Input type="tel" inputMode="tel" value={form.phone || ''} placeholder="(00) 00000-0000"
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </Field>
          <Field label="Nascimento">
            <Input type="date" value={form.birth_date || ''}
              onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))} />
          </Field>
          <Field label="Cidade">
            <Input value={form.city || ''} placeholder="Onde você mora"
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
          </Field>
          <Field label="Ocupação">
            <Input value={form.occupation || ''} placeholder="O que você faz"
              onChange={(e) => setForm((f) => ({ ...f, occupation: e.target.value }))} />
          </Field>
          <Field label="Renda mensal" hint="Usada só como referência sua. O sistema calcula pelas receitas lançadas." wide>
            <MoneyField value={form.monthly_income ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, monthly_income: v }))} />
          </Field>
        </div>
        <div className="card-actions">
          <Button busy={salvando} disabled={!alterado} onClick={salvar}>Salvar alterações</Button>
          {alterado && <Button variant="quiet" onClick={() => setForm(profile || {})}>Descartar</Button>}
        </div>
      </Card>

      <Card title="Seu uso do sistema">
        <div className="kpis">
          <div><span>Contas</span><b>{totalContas}</b></div>
          <div><span>Lançamentos</span><b>{totalLancamentos}</b></div>
          <div><span>Categorias</span><b>{(data.categories || []).length}</b></div>
          <div><span>Patrimônio</span><Amount value={patrimonio.total} hide={hide} /></div>
        </div>
      </Card>

      <Card title="Segurança">
        <div className="list">
          <Row label="Senha" sub="Recomendado trocar de tempos em tempos"
            right={<button className="link" onClick={() => setSenhaAberta(true)}>Alterar</button>} />
          <Row label="E-mail de acesso" sub={email}
            right={<Pill tone="neutral">fixo</Pill>} />
          <Row label="Proteção dos dados" sub="Cada registro é gravado com o seu identificador e o banco bloqueia leituras de outras contas."
            right={<Pill tone="accent">RLS ativo</Pill>} />
        </div>
        <div className="card-actions">
          <Button variant="outline" icon={<LogOut size={16} />} onClick={signOut}>Sair da conta</Button>
        </div>
      </Card>

      <PasswordSheet open={senhaAberta} email={email} onClose={() => setSenhaAberta(false)} notify={notify} />
    </div>
  )
}

function PasswordSheet({ open, email, onClose, notify }) {
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [repetida, setRepetida] = useState('')
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (open) { setAtual(''); setNova(''); setRepetida(''); setErro('') }
  }, [open])

  const forca = medirSenha(nova)

  async function trocar() {
    setErro('')
    if (nova !== repetida) { setErro('A confirmação não confere com a nova senha.'); return }
    if (nova.length < 8) { setErro('A nova senha precisa ter ao menos 8 caracteres.'); return }
    if (nova === atual) { setErro('A nova senha precisa ser diferente da atual.'); return }

    setBusy(true)
    try {
      // Reautentica antes de trocar: sem isso, uma sessão aberta e esquecida
      // num aparelho emprestado permitiria trocar a senha sem saber a antiga.
      const confere = await verifyPassword(email, atual)
      if (!confere) { setErro('A senha atual está incorreta.'); return }
      await updatePassword(nova)
      notify('Senha alterada.')
      onClose()
    } catch (e) {
      setErro(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      title="Alterar senha"
      onClose={onClose}
      footer={(
        <div className="sheet-actions">
          <Button variant="quiet" onClick={onClose}>Cancelar</Button>
          <Button busy={busy} onClick={trocar} disabled={!atual || !nova || !repetida}>Alterar</Button>
        </div>
      )}
    >
      <div className="form-grid">
        <Field label="Senha atual" wide>
          <Input type="password" autoComplete="current-password" value={atual}
            onChange={(e) => setAtual(e.target.value)} />
        </Field>
        <Field label="Nova senha" wide hint="Ao menos 8 caracteres. Misturar letras, números e símbolos ajuda.">
          <Input type="password" autoComplete="new-password" value={nova}
            onChange={(e) => setNova(e.target.value)} />
        </Field>
        {nova && (
          <div className="field field-wide">
            <ProgressBar value={forca.valor} tone={forca.tone} />
            <span className="field-hint">{forca.rotulo}</span>
          </div>
        )}
        <Field label="Repita a nova senha" wide>
          <Input type="password" autoComplete="new-password" value={repetida}
            onChange={(e) => setRepetida(e.target.value)} />
        </Field>
        {erro && <p className="form-error">{erro}</p>}
      </div>
    </Sheet>
  )
}

/** Medida simples e honesta: comprimento e variedade, sem prometer segurança. */
function medirSenha(senha) {
  if (!senha) return { valor: 0, rotulo: '', tone: 'risk' }
  let pontos = 0
  if (senha.length >= 8) pontos++
  if (senha.length >= 12) pontos++
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) pontos++
  if (/\d/.test(senha)) pontos++
  if (/[^\w\s]/.test(senha)) pontos++
  const escala = [
    { rotulo: 'Muito curta', tone: 'risk' },
    { rotulo: 'Fraca', tone: 'risk' },
    { rotulo: 'Razoável', tone: 'warn' },
    { rotulo: 'Boa', tone: 'warn' },
    { rotulo: 'Forte', tone: 'accent' },
    { rotulo: 'Muito forte', tone: 'accent' }
  ]
  return { valor: pontos / 5, ...escala[pontos] }
}
