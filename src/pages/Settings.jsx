import { useState } from 'react'
import { useT, setLang } from '../lib/i18n'

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
