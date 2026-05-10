import { useState } from 'react'
import { useT, setLang } from '../lib/i18n'

const THEMES = [
  { id: 'taisho',   bg: '#F7F5F0', primary: '#141414' },
  { id: 'yozakura', bg: '#1A1020', primary: '#E8829A' },
  { id: 'ruri',     bg: '#EEF1F8', primary: '#2B4490' },
  { id: 'kareno',   bg: '#F4EBD5', primary: '#7A4820' },
  { id: 'sumkin',   bg: '#0E0E0C', primary: '#C8A030' },
]

function applyTheme(id) {
  if (id === 'taisho') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', id)
  localStorage.setItem('app_theme', id)
}

function load(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) ?? def } catch { return def }
}

const LANGS = [
  { code: 'zh', label: '繁體中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
]

export default function Settings() {
  const { t, lang } = useT()
  const [profitRate, setProfitRate] = useState(load('profit_rate', 30))
  const [monthlySales, setMonthlySales] = useState(load('monthly_sales', 20))
  const [costs, setCosts] = useState(load('cost_items', []))
  const [newCostPreset, setNewCostPreset] = useState('')
  const [newCostCustom, setNewCostCustom] = useState('')
  const [newCostAmt, setNewCostAmt] = useState('')
  const [saved, setSaved] = useState(false)
  const [theme, setTheme] = useState(localStorage.getItem('app_theme') || 'taisho')
  const [pin, setPin] = useState(localStorage.getItem('members_pin') || '')
  const [pinSaved, setPinSaved] = useState(false)

  const totalCost = costs.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0)
  const perItem = monthlySales > 0 ? (totalCost / monthlySales).toFixed(0) : 0

  const isOther = newCostPreset === t.settings.costPresets[3]
  const resolvedName = isOther ? newCostCustom.trim() : newCostPreset

  const addCost = () => {
    if (!resolvedName) return
    setCosts(prev => [...prev, { name: resolvedName, amount: parseFloat(newCostAmt) || 0 }])
    setNewCostPreset(''); setNewCostCustom(''); setNewCostAmt('')
  }

  const removeCost = (i) => setCosts(prev => prev.filter((_, idx) => idx !== i))

  const save = () => {
    localStorage.setItem('profit_rate', JSON.stringify(parseFloat(profitRate) || 30))
    localStorage.setItem('monthly_sales', JSON.stringify(parseInt(monthlySales) || 20))
    localStorage.setItem('cost_items', JSON.stringify(costs))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <h1 style={{ paddingLeft: 0 }}>{t.settings.title}</h1>

      <div className="sell-section" style={{ marginBottom: 12 }}>
        <div className="section-title">{t.settings.language}</div>
        <div className="lang-row">
          {LANGS.map(l => (
            <button
              key={l.code}
              className={`lang-btn ${lang === l.code ? 'active' : ''}`}
              onClick={() => setLang(l.code)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sell-section" style={{ marginBottom: 12 }}>
        <div className="section-title">{t.settings.themeTitle}</div>
        <div style={{ display: 'flex', gap: 16, paddingTop: 4 }}>
          {THEMES.map((th, i) => (
            <button
              key={th.id}
              onClick={() => { applyTheme(th.id); setTheme(th.id) }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0, flex: 1,
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%', background: th.bg,
                border: theme === th.id ? `2.5px solid var(--text)` : '2px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'border 0.2s',
                boxShadow: theme === th.id ? '0 0 0 1.5px var(--bg)' : 'none',
              }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: th.primary }} />
              </div>
              <span style={{
                fontSize: 10, letterSpacing: '0.04em',
                color: theme === th.id ? 'var(--text)' : 'var(--muted)',
                fontWeight: theme === th.id ? 600 : 400,
              }}>
                {t.settings.themes[i]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="sell-section" style={{ marginBottom: 12 }}>
        <div className="section-title">{t.settings.profitTitle}</div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>{t.settings.profitLabel}</label>
          <input type="number" value={profitRate} onChange={e => setProfitRate(e.target.value)} placeholder="30" />
        </div>
      </div>

      <div className="sell-section" style={{ marginBottom: 12 }}>
        <div className="section-title">{t.settings.costTitle}</div>
        <div className="form-group">
          <label>{t.settings.monthlySalesLabel}</label>
          <input type="number" value={monthlySales} onChange={e => setMonthlySales(e.target.value)} placeholder="20" />
        </div>

        {costs.map((c, i) => (
          <div key={i} className="cost-row">
            <span className="cost-name">{c.name}</span>
            <span className="cost-amt">${parseFloat(c.amount).toLocaleString()}</span>
            <button className="cost-del" onClick={() => removeCost(i)}>✕</button>
          </div>
        ))}

        <div className="cost-add-row">
          <select className="cost-add-name" value={newCostPreset} onChange={e => setNewCostPreset(e.target.value)}>
            <option value="">— {t.settings.costTitle} —</option>
            {t.settings.costPresets.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input className="cost-add-amt" type="number" value={newCostAmt} onChange={e => setNewCostAmt(e.target.value)} placeholder="0" />
          <button className="cost-add-btn" onClick={addCost}>＋</button>
        </div>
        {isOther && (
          <input style={{ width: '100%', marginTop: 6 }} value={newCostCustom} onChange={e => setNewCostCustom(e.target.value)} placeholder={t.settings.costCustom} />
        )}

        {costs.length > 0 && (
          <div className="cost-summary">{t.settings.costSummary(totalCost.toLocaleString(), monthlySales, perItem)}</div>
        )}
      </div>

      {costs.length > 0 && (
        <div className="sell-section" style={{ marginBottom: 12, background: '#fff8ee' }}>
          <div className="section-title">{t.settings.exampleTitle}</div>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 2, whiteSpace: 'pre-line' }}>
            {t.settings.example(parseInt(perItem), 100 + parseFloat(profitRate || 30), Math.ceil((200 + parseInt(perItem)) * (1 + (parseFloat(profitRate) || 30) / 100)))}
          </div>
        </div>
      )}

      <button className="btn btn-primary" onClick={save}>
        {saved ? t.common.saved : t.common.save}
      </button>

      <div className="sell-section" style={{ marginTop: 12, marginBottom: 12 }}>
        <div className="section-title">{t.settings.pinTitle}</div>
        <div className="form-group" style={{ marginBottom: 8 }}>
          <label>{t.settings.pinLabel}</label>
          <input
            type="password" inputMode="numeric" maxLength={4}
            value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder={t.settings.pinPH}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
            localStorage.setItem('members_pin', pin)
            setPinSaved(true); setTimeout(() => setPinSaved(false), 2000)
          }}>
            {pinSaved ? t.common.saved : t.settings.pinSave}
          </button>
          {localStorage.getItem('members_pin') && (
            <button className="btn btn-danger" onClick={() => {
              localStorage.removeItem('members_pin'); setPin('')
            }}>
              {t.settings.pinClear}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
