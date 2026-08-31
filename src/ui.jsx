/* =====================================================================
   ui.jsx — primitivas de interface, gráficos, formulários e a casca.
   ===================================================================== */
import { AlertTriangle, Banknote, Building2, Check, ChevronDown, ChevronLeft, ChevronRight, CreditCard, Eye, EyeOff, Gauge, HeartPulse, LayoutGrid, ListPlus, Loader2, LogOut, Percent, Plus, Receipt, RefreshCw, Repeat, Settings as SettingsIcon, Target, Upload, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { money, money as fmtMoney, SETTLED, TABLES, accountLedgerBalance, accountsOverview, addMonths, applyFilters, baseline, cardInvoice, cardLedgerDebt, cardsOverview, cashProjection, categorize, cleanNumberInput, commitmentsForMonth, currentMonth, dayLabel, decimal, defaultHints, deleteRow, dueDateInMonth, ensureDefaults, fetchSettings, fetchTable, fingerprint, flowForMonth, flowSeries, friendlyError, fullDate, groupByCategory, initials, insertMany, insertRow, iso, monthEnd, monthKey, monthLabel, monthRange, monthStart, monthlyRateOf, monthsBetween, n, netWorth, nextOccurrence, normalize, objectivesOverview, occurrencesIn, parseCsv, parseMoney, parseOfx, parseStatement, parseStatementDate, pendingInterest, percent, projectInvestments, reservePlan, saveRow, saveSettings, suggestPattern, sum, supabase, toDate, today, totalCardDebt, totalCash, totalInvested, txMonth, updateRow, withOccurrenceIndex } from './lib'
import { useAuth, useData, useLookup } from './data'

/* ---------- ui ---------- */
// ---------------------------------------------------------------------
export function Button({ variant = 'solid', size = 'md', busy, icon, children, ...rest }) {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      disabled={busy || rest.disabled}
      {...rest}
    >
      {busy ? <Loader2 size={16} className="spin" /> : icon}
      {children}
    </button>
  )
}

export function IconButton({ label, children, ...rest }) {
  return (
    <button className="icon-btn" aria-label={label} title={label} {...rest}>
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------
export function Card({ title, subtitle, action, children, tone, className = '' }) {
  return (
    <section className={`card ${tone ? `card-${tone}` : ''} ${className}`}>
      {(title || action) && (
        <header className="card-head">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export const Pill = ({ tone = 'neutral', children }) => (
  <span className={`pill pill-${tone}`}>{children}</span>
)

export const Empty = ({ title, hint, action }) => (
  <div className="empty">
    <p className="empty-title">{title}</p>
    {hint && <p className="empty-hint">{hint}</p>}
    {action}
  </div>
)

export const Amount = ({ value, hide, signed = false, tone, className = '' }) => {
  const v = Number(value) || 0
  const auto = signed ? (v > 0 ? 'up' : v < 0 ? 'down' : 'flat') : tone
  return (
    <b className={`amount ${auto ? `amount-${auto}` : ''} ${className}`}>
      {signed && v > 0 ? '+' : ''}{fmtMoney(v, { hide })}
    </b>
  )
}

export const Row = ({ label, sub, badge, value, right, onClick, leading }) => {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`lrow ${onClick ? 'lrow-clickable' : ''}`} onClick={onClick} type={onClick ? 'button' : undefined}>
      {leading && <span className="lrow-leading">{leading}</span>}
      <span className="lrow-main">
        <span className="lrow-label">{label}{badge}</span>
        {sub && <span className="lrow-sub">{sub}</span>}
      </span>
      {right || (value != null && <span className="lrow-value">{value}</span>)}
    </Tag>
  )
}

export const ProgressBar = ({ value = 0, tone = 'accent' }) => (
  <div className="progress"><span className={`progress-fill progress-${tone}`} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} /></div>
)

// ---------------------------------------------------------------------
// Painel deslizante — vira modal centrado no desktop
// ---------------------------------------------------------------------
export function Sheet({ open, title, onClose, children, footer }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="sheet-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <header className="sheet-head">
          <span className="sheet-grip" />
          <h3>{title}</h3>
          <IconButton label="Fechar" onClick={onClose}><X size={18} /></IconButton>
        </header>
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-foot">{footer}</footer>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// Campos
// ---------------------------------------------------------------------
export function Field({ label, hint, children, wide }) {
  return (
    <label className={`field ${wide ? 'field-wide' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export const Input = (props) => <input className="input" {...props} />
export const Textarea = (props) => <textarea className="input" rows={3} {...props} />

export function Select({ children, placeholder, ...rest }) {
  return (
    <span className="select-wrap">
      <select className="input" {...rest}>
        {placeholder != null && <option value="">{placeholder}</option>}
        {children}
      </select>
      <ChevronDown size={16} />
    </span>
  )
}

/** Campo monetário com teclado numérico e formato pt-BR. */
export function MoneyField({ value, onChange, placeholder = '0,00', ...rest }) {
  const [text, setText] = useState(() => (value == null || value === '' ? '' : String(value).replace('.', ',')))
  const focused = useRef(false)

  useEffect(() => {
    if (focused.current) return
    setText(value == null || value === '' ? '' : String(value).replace('.', ','))
  }, [value])

  return (
    <input
      className="input input-money"
      inputMode="decimal"
      placeholder={placeholder}
      value={text}
      onFocus={() => { focused.current = true }}
      onBlur={() => { focused.current = false }}
      onChange={(e) => {
        const raw = cleanNumberInput(e.target.value)
        setText(raw)
        onChange(raw === '' ? '' : parseMoney(raw))
      }}
      {...rest}
    />
  )
}

export function Switch({ checked, onChange, label }) {
  const id = useId()
  return (
    <div className="switch-row">
      <label htmlFor={id}>{label}</label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={!!checked}
        className={`switch ${checked ? 'switch-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  )
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------
export function ConfirmDelete({ onConfirm, label = 'Excluir' }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return undefined
    const t = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <Button
      variant={armed ? 'danger' : 'quiet'}
      type="button"
      onClick={() => (armed ? onConfirm() : setArmed(true))}
    >
      {armed ? 'Confirmar exclusão' : label}
    </Button>
  )
}

export function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`toast toast-${toast.tone}`} role="status">
      {toast.tone === 'error' ? <AlertTriangle size={16} /> : <Check size={16} />}
      {toast.message}
    </div>
  )
}

export const Loading = ({ label = 'Carregando' }) => (
  <div className="loading"><Loader2 size={18} className="spin" /> {label}…</div>
)

/* ---------- Charts ---------- */
const AXIS = { fontSize: 11, fill: 'var(--muted)' }
const GRID = 'var(--line)'

export const PALETTE = [
  '#17604A', '#2B5B7E', '#B8791F', '#7A4A8C', '#A83232',
  '#3F7A6B', '#8C6239', '#4A6FA5', '#6E8C3A', '#9A4C6B'
]

const shortMoney = (v) => money(v, { compact: true })

function Box({ children, height = 240 }) {
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
    </div>
  )
}

const TipContent = ({ active, payload, label, hide }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="tip">
      <b>{typeof label === 'string' && /^\d{4}-\d{2}$/.test(label) ? monthLabel(label, { long: true }) : label}</b>
      {payload.map((p) => (
        <span key={p.dataKey || p.name}>
          <i style={{ background: p.color || p.fill }} />
          {p.name}: {money(p.value, { hide })}
        </span>
      ))}
    </div>
  )
}

/** Receitas x despesas por mês, com a linha do resultado. */
export function FlowChart({ series, hide }) {
  return (
    <Box height={260}>
      <ComposedChart data={series} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tickFormatter={(m) => monthLabel(m)} tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={shortMoney} tick={AXIS} tickLine={false} axisLine={false} width={64} />
        <Tooltip content={<TipContent hide={hide} />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="income" name="Receitas" fill="#17604A" radius={[3, 3, 0, 0]} maxBarSize={26} />
        <Bar dataKey="expense" name="Despesas" fill="#C4655C" radius={[3, 3, 0, 0]} maxBarSize={26} />
        <Line type="monotone" dataKey="result" name="Resultado" stroke="#1B2A38" strokeWidth={2} dot={false} />
      </ComposedChart>
    </Box>
  )
}

/** Saldo projetado. */
export function BalanceChart({ series, hide }) {
  return (
    <Box height={220}>
      <AreaChart data={series} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="gradBalance" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#17604A" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#17604A" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tickFormatter={(m) => monthLabel(m)} tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={shortMoney} tick={AXIS} tickLine={false} axisLine={false} width={64} />
        <Tooltip content={<TipContent hide={hide} />} />
        <Area type="monotone" dataKey="balance" name="Saldo projetado" stroke="#17604A" strokeWidth={2} fill="url(#gradBalance)" />
      </AreaChart>
    </Box>
  )
}

/** Ranking de categorias — barras horizontais legíveis no celular. */
export function CategoryChart({ data, hide }) {
  const top = data.slice(0, 8)
  return (
    <Box height={Math.max(180, top.length * 34 + 30)}>
      <BarChart data={top} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tickFormatter={shortMoney} tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={104} tick={{ ...AXIS, fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip content={<TipContent hide={hide} />} />
        <Bar dataKey="value" name="Total" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {top.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </Box>
  )
}

/** Evolução do patrimônio. */
export function NetWorthChart({ series, hide }) {
  return (
    <Box height={230}>
      <ComposedChart data={series} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tickFormatter={(m) => monthLabel(m)} tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={shortMoney} tick={AXIS} tickLine={false} axisLine={false} width={64} />
        <Tooltip content={<TipContent hide={hide} />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="cash" name="Caixa" stackId="a" fill="#3F7A6B" maxBarSize={28} />
        <Bar dataKey="investments" name="Investimentos" stackId="a" fill="#2B5B7E" maxBarSize={28} />
        <Bar dataKey="properties" name="Imóveis" stackId="a" fill="#B8791F" maxBarSize={28} />
        <Line type="monotone" dataKey="net_worth" name="Patrimônio líquido" stroke="#101A24" strokeWidth={2} dot={false} />
      </ComposedChart>
    </Box>
  )
}

/**
 * Régua de caixa: uma coluna por mês projetado. Verde acima da reserva
 * necessária, âmbar entre zero e a reserva, vermelho no negativo.
 * É a leitura de um segundo: "até quando o dinheiro dura".
 */
export function RunwayStrip({ months, reserve = 0, hide, onSelect, selected }) {
  const values = months.map((m) => m.balance)
  const max = Math.max(...values, reserve, 1)
  const min = Math.min(...values, 0)
  const span = max - min || 1
  const zero = ((max - 0) / span) * 100

  return (
    <div className="runway">
      <div className="runway-plot">
        <span className="runway-line runway-zero" style={{ top: `${zero}%` }} />
        {reserve > 0 && (
          <span className="runway-line runway-reserve" style={{ top: `${((max - reserve) / span) * 100}%` }}>
            <i>reserva</i>
          </span>
        )}
        {months.map((m) => {
          const top = ((max - Math.max(m.balance, 0)) / span) * 100
          const bottom = 100 - ((max - Math.min(m.balance, 0)) / span) * 100
          const tone = m.balance < 0 ? 'risk' : m.balance < reserve ? 'warn' : 'safe'
          return (
            <button
              key={m.month}
              type="button"
              className={`runway-col ${selected === m.month ? 'on' : ''}`}
              onClick={() => onSelect?.(m.month)}
              title={`${monthLabel(m.month, { long: true })}: ${money(m.balance, { hide })}`}
            >
              <span className={`runway-bar runway-${tone}`} style={{ top: `${top}%`, bottom: `${bottom}%` }} />
            </button>
          )
        })}
      </div>
      <div className="runway-axis">
        {months.map((m) => (
          <span key={m.month} className={selected === m.month ? 'on' : ''}>{monthLabel(m.month).split('/')[0]}</span>
        ))}
      </div>
    </div>
  )
}

/* ---------- RecordSheet ---------- */
/**
 * Formulário genérico. Cada tela declara os campos e o resto é igual:
 * mesma validação, mesmo rodapé, mesma exclusão em duas etapas.
 *
 * fields: [{ name, label, type, options, hint, wide, required, step, placeholder, when }]
 * types: text | money | percent | number | date | month | select | textarea | switch
 */
export function RecordSheet({
  open, title, fields, record, onClose, onSave, onDelete, saveLabel = 'Salvar'
}) {
  const [form, setForm] = useState(record || {})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { setForm(record || {}); setError('') }, [record, open])

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }))
  const visible = fields.filter((f) => !f.when || f.when(form))

  async function submit(e) {
    e.preventDefault()
    const missing = visible.find((f) => f.required && (form[f.name] == null || form[f.name] === ''))
    if (missing) { setError(`Preencha "${missing.label}".`); return }
    setBusy(true)
    setError('')
    try {
      // Percentuais já chegam como fração (0,85% -> 0.0085) direto do campo.
      const payload = { ...form }
      delete payload.__rawPct
      await onSave(payload)
      onClose()
    } catch (err) {
      setError(err?.message || 'Não foi possível salvar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      title={title}
      onClose={onClose}
      footer={(
        <div className="sheet-actions">
          {onDelete && record?.id && <ConfirmDelete onConfirm={async () => { await onDelete(record); onClose() }} />}
          <Button variant="quiet" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="record-form" busy={busy}>{saveLabel}</Button>
        </div>
      )}
    >
      <form id="record-form" className="form-grid" onSubmit={submit}>
        {visible.map((f) => {
          const value = form[f.name] ?? ''
          const common = { id: f.name, required: f.required }
          return (
            <Field key={f.name} label={f.label} hint={f.hint} wide={f.wide || ['textarea', 'switch'].includes(f.type)}>
              {f.type === 'money' && (
                <MoneyField value={value} onChange={(v) => set(f.name, v)} {...common} />
              )}
              {f.type === 'percent' && (
                <Input
                  type="number" step={f.step || '0.0001'} inputMode="decimal"
                  placeholder={f.placeholder || '0,85'}
                  value={value === '' ? '' : (form.__rawPct?.[f.name] ?? Number((n(value) * 100).toFixed(6)))}
                  onChange={(e) => {
                    const raw = e.target.value
                    setForm((prev) => ({
                      ...prev,
                      __rawPct: { ...(prev.__rawPct || {}), [f.name]: raw },
                      [f.name]: raw === '' ? '' : n(raw) / 100
                    }))
                  }}
                  {...common}
                />
              )}
              {f.type === 'number' && (
                <Input type="number" step={f.step || '1'} inputMode="numeric" value={value}
                  onChange={(e) => set(f.name, e.target.value === '' ? '' : Number(e.target.value))} {...common} />
              )}
              {f.type === 'date' && (
                <Input type="date" value={value || ''} onChange={(e) => set(f.name, e.target.value)} {...common} />
              )}
              {f.type === 'month' && (
                <Input type="month" value={String(value || '').slice(0, 7)}
                  onChange={(e) => set(f.name, e.target.value ? `${e.target.value}-01` : '')} {...common} />
              )}
              {f.type === 'select' && (
                <Select value={value || ''} placeholder={f.placeholder ?? '—'}
                  onChange={(e) => set(f.name, e.target.value)} {...common}>
                  {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              )}
              {f.type === 'textarea' && (
                <Textarea value={value || ''} onChange={(e) => set(f.name, e.target.value)} {...common} />
              )}
              {f.type === 'switch' && (
                <Switch checked={value === undefined ? !!f.default : !!value}
                  onChange={(v) => set(f.name, v)} label={f.hint || ''} />
              )}
              {(!f.type || f.type === 'text') && (
                <Input type="text" placeholder={f.placeholder} value={value}
                  onChange={(e) => set(f.name, e.target.value)} {...common} />
              )}
            </Field>
          )
        })}
        {error && <p className="form-error">{error}</p>}
      </form>
    </Sheet>
  )
}

/** Percentuais são gravados como fração (0.0085 = 0,85% a.m.). */
export const toPercentInput = (record, keys) => {
  if (!record) return record
  const out = { ...record }
  keys.forEach((k) => { if (out[k] != null) out[k] = Number(out[k]) })
  return out
}

/* ---------- TransactionSheet ---------- */
const KINDS = [
  { value: 'expense', label: 'Despesa' },
  { value: 'income', label: 'Receita' },
  { value: 'investment', label: 'Aporte' },
  { value: 'transfer', label: 'Transferência' },
  { value: 'card_payment', label: 'Fatura' }
]

const blank = (month) => ({
  kind: 'expense',
  tx_date: today(),
  competence_month: month ? monthStart(month) : null,
  description: '',
  amount: '',
  status: 'cleared',
  source: 'manual'
})

export function TransactionSheet({ open, record, onClose }) {
  const data = useData()
  const { accounts, cards, categories, objectives, investments, properties, month, save, remove } = data
  const [form, setForm] = useState(blank(month))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setForm(record ? { ...record, amount: Math.abs(n(record.amount)) } : blank(month))
    setError('')
  }, [open, record, month])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const kind = form.kind || 'expense'
  const usesCard = kind === 'expense' || kind === 'card_payment'
  const usesAccount = kind !== 'expense' || !form.card_id

  const categoryOptions = useMemo(() => {
    const wanted = kind === 'income' ? 'income' : kind === 'transfer' ? 'transfer' : 'expense'
    return categories.filter((c) => !c.archived && c.kind === wanted)
  }, [categories, kind])

  async function submit(e) {
    e.preventDefault()
    const value = Math.abs(n(form.amount))
    if (!form.description?.trim()) { setError('Descreva o lançamento.'); return }
    if (!value) { setError('Informe um valor maior que zero.'); return }
    if (kind === 'transfer' && !form.counterparty_account_id) {
      setError('Escolha a conta de destino.'); return
    }
    setBusy(true)
    setError('')
    try {
      const signed = kind === 'income' ? value : -value
      await save('transactions', {
        ...form,
        amount: signed,
        competence_month: form.competence_month || monthStart(String(form.tx_date).slice(0, 7)),
        card_id: usesCard ? form.card_id || null : null,
        bank_account_id: kind === 'expense' && form.card_id ? null : form.bank_account_id || null,
        counterparty_account_id: kind === 'transfer' ? form.counterparty_account_id : null,
        objective_id: kind === 'investment' ? form.objective_id || null : form.objective_id || null,
        investment_id: kind === 'investment' ? form.investment_id || null : null
      })
      onClose()
    } catch (err) {
      setError(err?.message || 'Não foi possível salvar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      title={record?.id ? 'Editar lançamento' : 'Novo lançamento'}
      onClose={onClose}
      footer={(
        <div className="sheet-actions">
          {record?.id && <ConfirmDelete onConfirm={async () => { await remove('transactions', record.id); onClose() }} />}
          <Button variant="quiet" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="tx-form" busy={busy}>Salvar</Button>
        </div>
      )}
    >
      <form id="tx-form" className="form-grid" onSubmit={submit}>
        <div className="field field-wide">
          <span className="field-label">Tipo</span>
          <Segmented value={kind} onChange={(v) => set('kind', v)} options={KINDS} />
        </div>

        <Field label="Descrição" wide>
          <Input value={form.description || ''} onChange={(e) => set('description', e.target.value)}
            placeholder="Ex.: Condomínio de novembro" required />
        </Field>

        <Field label="Valor" hint="Sempre positivo. O sinal vem do tipo.">
          <MoneyField value={form.amount} onChange={(v) => set('amount', v)} required />
        </Field>

        <Field label="Data">
          <Input type="date" value={form.tx_date || ''} onChange={(e) => set('tx_date', e.target.value)} required />
        </Field>

        <Field label="Competência" hint="Mês em que o gasto deve entrar no fluxo.">
          <Input type="month" value={String(form.competence_month || form.tx_date || '').slice(0, 7)}
            onChange={(e) => set('competence_month', e.target.value ? `${e.target.value}-01` : null)} />
        </Field>

        <Field label="Situação">
          <Select value={form.status || 'cleared'} onChange={(e) => set('status', e.target.value)}>
            <option value="cleared">Liquidado</option>
            <option value="planned">Previsto</option>
            <option value="pending">Pendente</option>
            <option value="reconciled">Conciliado</option>
          </Select>
        </Field>

        {usesCard && (
          <Field label="Cartão" hint={kind === 'expense' ? 'Deixe vazio se saiu da conta.' : undefined}>
            <Select value={form.card_id || ''} placeholder="Nenhum" onChange={(e) => set('card_id', e.target.value)}>
              {cards.filter((c) => !c.archived).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        )}

        {usesAccount && (
          <Field label={kind === 'transfer' ? 'Conta de origem' : 'Conta'}>
            <Select value={form.bank_account_id || ''} placeholder="Nenhuma"
              onChange={(e) => set('bank_account_id', e.target.value)}>
              {accounts.filter((a) => !a.archived).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
        )}

        {kind === 'transfer' && (
          <Field label="Conta de destino">
            <Select value={form.counterparty_account_id || ''} placeholder="Escolha"
              onChange={(e) => set('counterparty_account_id', e.target.value)}>
              {accounts.filter((a) => !a.archived && a.id !== form.bank_account_id)
                .map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
        )}

        {kind === 'investment' && (
          <>
            <Field label="Objetivo">
              <Select value={form.objective_id || ''} placeholder="Sem objetivo"
                onChange={(e) => set('objective_id', e.target.value)}>
                {objectives.filter((o) => !o.archived).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </Select>
            </Field>
            <Field label="Investimento" hint="O aporte soma ao valor atual deste investimento.">
              <Select value={form.investment_id || ''} placeholder="Nenhum"
                onChange={(e) => set('investment_id', e.target.value)}>
                {investments.filter((i) => !i.archived)
                  .filter((i) => !form.objective_id || i.objective_id === form.objective_id)
                  .map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </Select>
            </Field>
          </>
        )}

        {kind !== 'transfer' && kind !== 'investment' && (
          <Field label="Categoria">
            <Select value={form.category_id || ''} placeholder="Sem categoria"
              onChange={(e) => set('category_id', e.target.value)}>
              {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        )}

        {properties.length > 0 && kind === 'expense' && (
          <Field label="Imóvel" hint="Opcional, para separar custos por imóvel.">
            <Select value={form.property_id || ''} placeholder="Nenhum"
              onChange={(e) => set('property_id', e.target.value)}>
              {properties.filter((p) => !p.archived).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
        )}

        <Field label="Observações" wide>
          <Textarea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>

        {error && <p className="form-error">{error}</p>}
      </form>
    </Sheet>
  )
}

/* ---------- Layout ---------- */
export const NAV = [
  { path: 'painel', label: 'Painel', icon: Gauge, primary: true },
  { path: 'fluxo', label: 'Fluxo', icon: LayoutGrid, primary: true },
  { path: 'lancamentos', label: 'Lançamentos', icon: Receipt, primary: true },
  { path: 'contas', label: 'Contas', icon: Banknote, primary: true },
  { path: 'cartoes', label: 'Cartões', icon: CreditCard },
  { path: 'investimentos', label: 'Investimentos', icon: Target },
  { path: 'imoveis', label: 'Imóveis', icon: Building2 },
  { path: 'assinaturas', label: 'Assinaturas', icon: Repeat },
  { path: 'saude', label: 'Saúde', icon: HeartPulse },
  { path: 'capital', label: 'Custos de capital', icon: Percent },
  { path: 'importar', label: 'Importar extratos', icon: Upload },
  { path: 'ajustes', label: 'Ajustes', icon: SettingsIcon }
]

const MONTH_PAGES = ['painel', 'fluxo', 'lancamentos', 'cartoes', 'saude', 'capital']

export function Layout({ route, navigate, onNewEntry, children }) {
  const { month, setMonth, reload, toast, settings, updateSettings } = useData()
  const { signOut, session } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)
  const showMonth = MONTH_PAGES.includes(route)
  const hide = !!settings?.hide_values
  const active = NAV.find((i) => i.path === route)

  const go = (path) => { navigate(path); setMoreOpen(false) }

  return (
    <div className="shell">
      <aside className="rail">
        <div className="rail-brand">
          <span className="mark">MF</span>
          <div>
            <b>Meu Financeiro</b>
            <small>{session?.user?.email}</small>
          </div>
        </div>
        <nav>
          {NAV.map((item) => (
            <button
              key={item.path}
              className={`rail-link ${route === item.path ? 'on' : ''}`}
              onClick={() => go(item.path)}
            >
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </nav>
        <button className="rail-link rail-out" onClick={signOut}>
          <LogOut size={18} /> Sair
        </button>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">
            <span className="eyebrow">Meu Financeiro</span>
            <h1>{active?.label || 'Painel'}</h1>
          </div>

          <div className="topbar-tools">
            {showMonth && (
              <div className="month-picker">
                <IconButton label="Mês anterior" onClick={() => setMonth(addMonths(month, -1))}>
                  <ChevronLeft size={18} />
                </IconButton>
                <button className="month-current" onClick={() => setMonth(currentMonth())}>
                  {monthLabel(month, { long: true })}
                </button>
                <IconButton label="Próximo mês" onClick={() => setMonth(addMonths(month, 1))}>
                  <ChevronRight size={18} />
                </IconButton>
              </div>
            )}
            <IconButton
              label={hide ? 'Mostrar valores' : 'Ocultar valores'}
              onClick={() => updateSettings({ hide_values: !hide })}
            >
              {hide ? <EyeOff size={18} /> : <Eye size={18} />}
            </IconButton>
            <IconButton label="Recarregar dados" onClick={reload}><RefreshCw size={18} /></IconButton>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>

      <nav className="tabbar">
        {NAV.filter((i) => i.primary).map((item) => (
          <button
            key={item.path}
            className={route === item.path ? 'on' : ''}
            onClick={() => go(item.path)}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
        <button onClick={() => setMoreOpen(true)} className={moreOpen ? 'on' : ''}>
          <ListPlus size={20} />
          <span>Mais</span>
        </button>
      </nav>

      <button className="fab" onClick={onNewEntry} aria-label="Novo lançamento">
        <Plus size={22} />
      </button>

      <Sheet open={moreOpen} title="Seções" onClose={() => setMoreOpen(false)}>
        <div className="more-grid">
          {NAV.map((item) => (
            <button key={item.path} className={route === item.path ? 'on' : ''} onClick={() => go(item.path)}>
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
          <button onClick={signOut}><LogOut size={20} /> Sair</button>
        </div>
      </Sheet>

      <Toast toast={toast} />
    </div>
  )
}
