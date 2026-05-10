import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useT } from '../lib/i18n'

const maskPhone = (p) => p ? p.slice(0, 4) + '***' + p.slice(-3) : ''
const maskEmail = (e) => {
  if (!e) return ''
  const [user, domain] = e.split('@')
  return (user || '').slice(0, 2) + '***' + (domain ? '@' + domain : '')
}

const CITIES = ['台北市','新北市','桃園市','台中市','台南市','高雄市','基隆市','新竹市','嘉義市','新竹縣','苗栗縣','彰化縣','南投縣','雲林縣','嘉義縣','屏東縣','宜蘭縣','花蓮縣','台東縣','澎湖縣','金門縣','連江縣','海外']
const SIZES = ['XXS','XS','S','M','L','XL','XXL','3XL']

export default function Members() {
  const { t } = useT()
  const m = t.members
  const [customers, setCustomers] = useState([])
  const [selected, setSelected] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', gender: '', region: '', preferred_size: '', occupation: '', age_group: '', notes: '' })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [unlocked, setUnlocked] = useState(!localStorage.getItem('members_pin'))
  const [pinInput, setPinInput] = useState('')
  const [pinWrong, setPinWrong] = useState(false)
  const [feedbacks, setFeedbacks] = useState([])
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false)
  const [showFeedbacks, setShowFeedbacks] = useState(false)

  useEffect(() => { fetchCustomers() }, [])
  useEffect(() => { if (selected) fetchPurchases() }, [selected])

  async function fetchCustomers() {
    setLoading(true)
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
    setCustomers(data || [])
    setLoading(false)
  }

  async function fetchPurchases() {
    const { data } = await supabase.from('items').select('*').eq('customer_id', selected.id).order('sold_at', { ascending: false })
    setPurchases(data || [])
  }

  async function fetchFeedbacks() {
    setLoadingFeedbacks(true)
    const { data } = await supabase.from('feedbacks').select('id,content,created_at').order('created_at', { ascending: false })
    setFeedbacks(data || [])
    setLoadingFeedbacks(false)
  }

  async function createCustomer() {
    if (!form.name.trim()) return
    await supabase.from('customers').insert({
      name: form.name.trim(), phone: form.phone.trim(),
      email: form.email.trim(), gender: form.gender,
      region: form.region, preferred_size: form.preferred_size,
      occupation: form.occupation, age_group: form.age_group, notes: form.notes.trim()
    })
    setShowNew(false)
    setForm({ name: '', phone: '', email: '', gender: '', region: '', preferred_size: '', occupation: '', age_group: '', notes: '' })
    fetchCustomers()
  }

  async function deleteCustomer() {
    if (!window.confirm(m.confirmDelete(selected.name))) return
    await supabase.from('items').update({ customer_id: null }).eq('customer_id', selected.id)
    await supabase.from('customers').delete().eq('id', selected.id)
    setSelected(null); fetchCustomers()
  }

  function downloadCSV() {
    const BOM = '﻿'
    const rows = customers.map(c => [
      c.name, c.phone || '', c.email || '', c.gender || '', c.region || '',
      c.occupation || '', c.age_group || '', c.created_at ? c.created_at.split('T')[0] : ''
    ].map(v => `"${v}"`).join(','))
    const csv = BOM + [m.csvHeader, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = m.csvFilename; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = customers.filter(c =>
    c.name.includes(search) || (c.phone || '').includes(search) || (c.email || '').includes(search)
  )
  const totalSpent = purchases.reduce((s, i) => s + (i.sold_price || 0), 0)
  const registerUrl = window.location.origin + window.location.pathname + '?register=1'
  const feedbackUrl = window.location.origin + window.location.pathname + '?feedback=1'
  const lookupUrl = window.location.origin + window.location.pathname + '?lookup=1'

  const checkPin = () => {
    if (pinInput === localStorage.getItem('members_pin')) {
      setUnlocked(true)
    } else {
      setPinWrong(true)
      setPinInput('')
      setTimeout(() => setPinWrong(false), 1500)
    }
  }

  if (!unlocked) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '0.04em', marginBottom: 20 }}>{t.membersPin.title}</div>
        <input
          type="password" inputMode="numeric" maxLength={4}
          value={pinInput}
          onChange={e => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onKeyDown={e => e.key === 'Enter' && checkPin()}
          style={{ textAlign: 'center', fontSize: 24, letterSpacing: '0.3em', width: 140, marginBottom: 12 }}
          autoFocus
        />
        {pinWrong && <div style={{ color: '#cc0000', fontSize: 13, marginBottom: 8 }}>{t.membersPin.wrong}</div>}
        <button className="btn btn-primary" onClick={checkPin}>{t.membersPin.submit}</button>
      </div>
    )
  }

  if (selected) {
    return (
      <div>
        <button className="back-btn" onClick={() => { setSelected(null); setPurchases([]) }}>{t.common.back}</button>
        <div style={{ padding: '0 16px' }}>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '0.01em', marginBottom: 4 }}>{selected.name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.04em', marginBottom: 20, lineHeight: 1.8 }}>
            {selected.phone && <span>📞 {selected.phone}　</span>}
            {selected.email && <span>✉ {selected.email}　</span>}
            {selected.gender && <span>{selected.gender}　</span>}
            {selected.region && <span>{selected.region}　</span>}
            {selected.occupation && <span>{selected.occupation}　</span>}
            {selected.age_group && <span>{selected.age_group}　</span>}
            {selected.preferred_size && <span>SIZE {selected.preferred_size}</span>}
          </div>

          <div className="report-status" style={{ margin: '0 0 1px', borderRadius: 0 }}>
            <div className="report-stat">
              <div className="report-stat-num">{purchases.length}</div>
              <div className="report-stat-label">{m.purchases}</div>
            </div>
            <div className="report-stat-divider" />
            <div className="report-stat">
              <div className="report-stat-num">${totalSpent.toLocaleString()}</div>
              <div className="report-stat-label">{m.totalSpent}</div>
            </div>
          </div>

          {selected.notes && (
            <div className="sell-section" style={{ marginBottom: 1 }}>
              <div className="section-title">{m.notes}</div>
              <div style={{ fontSize: 14, lineHeight: 1.7 }}>{selected.notes}</div>
            </div>
          )}

          <div className="section-title" style={{ padding: '16px 0 10px', color: 'var(--muted)' }}>{m.purchaseHistory}</div>
          {purchases.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13, padding: '20px 0' }}>{m.noPurchases}</div>
          ) : purchases.map(item => (
            <div key={item.id} className="sell-section" style={{ marginBottom: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {item.era && `${item.era} · `}{item.category}
                  {item.sold_at && ` · ${item.sold_at.split('T')[0]}`}
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gold)' }}>${item.sold_price}</div>
            </div>
          ))}

          <div style={{ height: 20 }} />
          <button className="btn btn-danger" onClick={deleteCustomer}>{m.deleteBtn}</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16 }}>
        <h1>{m.title}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-text" style={{ fontSize: 13, padding: '6px 10px' }} onClick={() => setShowQR(true)}>{m.qr}</button>
          <button className="btn btn-text" style={{ fontSize: 13, padding: '6px 10px' }} onClick={downloadCSV}>{m.export}</button>
        </div>
      </div>
      <input className="search-bar" placeholder={m.search} value={search} onChange={e => setSearch(e.target.value)} />

      {loading ? <div className="loading">{t.common.loading}</div> : filtered.length === 0 ? (
        <div className="empty" style={{ whiteSpace: 'pre-line' }}>{m.empty}</div>
      ) : filtered.map(c => (
        <div key={c.id} className="card" onClick={() => setSelected(c)} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="card-name">{c.name}</div>
              <div className="card-meta">
                {[maskPhone(c.phone), maskEmail(c.email), c.region].filter(Boolean).join(' · ') || '—'}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.04em' }}>
              {c.created_at?.split('T')[0]}
            </div>
          </div>
        </div>
      ))}

      <div style={{ padding: '20px 16px 4px' }}>
        <button
          className="btn btn-text"
          style={{ fontSize: 13, padding: '6px 0', color: 'var(--muted)' }}
          onClick={() => {
            if (!showFeedbacks && !feedbacks.length) fetchFeedbacks()
            setShowFeedbacks(v => !v)
          }}
        >
          {m.feedbackTitle} {showFeedbacks ? '▲' : '▼'}
        </button>
        {showFeedbacks && (
          loadingFeedbacks ? (
            <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>{t.common.loading}</div>
          ) : feedbacks.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>{m.feedbackEmpty}</div>
          ) : feedbacks.map(fb => (
            <div key={fb.id} className="sell-section" style={{ marginBottom: 1, fontSize: 14, lineHeight: 1.7 }}>
              <div>{fb.content}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{fb.created_at?.slice(0, 4)}</div>
            </div>
          ))
        )}
      </div>

      <button className="fab" onClick={() => setShowNew(true)}>＋</button>

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{m.addTitle}</h2>
            <div className="form-group">
              <label>{m.nickname}</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={m.nicknamePH} autoFocus />
            </div>
            <div className="form-group">
              <label>{m.phone}</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0912-345-678" />
            </div>
            <div className="form-group">
              <label>{m.email}</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" />
            </div>
            <div className="form-group">
              <label>{m.gender}</label>
              <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                {m.genderOptions.map((g, i) => <option key={i} value={i === 0 ? '' : g}>{g}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{m.size}</label>
              <select value={form.preferred_size} onChange={e => setForm(f => ({ ...f, preferred_size: e.target.value }))}>
                <option value="">{m.sizeNone}</option>
                {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{m.region}</label>
              <select value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}>
                <option value="">{m.regionNone}</option>
                {CITIES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{m.occupation}</label>
              <select value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))}>
                <option value="">{m.occupationNone}</option>
                {m.occupations.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{m.ageGroup}</label>
              <select value={form.age_group} onChange={e => setForm(f => ({ ...f, age_group: e.target.value }))}>
                <option value="">{m.ageGroupNone}</option>
                {m.ageGroups.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{m.notes}</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder={m.notesPH} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-text" onClick={() => setShowNew(false)}>{t.common.cancel}</button>
              <button className="btn btn-primary" onClick={createCustomer}>{m.create}</button>
            </div>
          </div>
        </div>
      )}

      {showQR && (
        <div className="modal-overlay" onClick={() => setShowQR(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <h2>{m.qrTitle}</h2>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(registerUrl)}`}
              alt="QR Code"
              style={{ width: 200, height: 200, margin: '8px auto 8px', display: 'block' }}
            />
            <div style={{ fontSize: 11, color: 'var(--muted)', wordBreak: 'break-all', marginBottom: 20 }}>{registerUrl}</div>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', marginBottom: 6 }}>{m.lookupTitle}</div>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(lookupUrl)}`}
              alt="Lookup QR"
              style={{ width: 180, height: 180, margin: '0 auto 8px', display: 'block' }}
            />
            <div style={{ fontSize: 11, color: 'var(--muted)', wordBreak: 'break-all', marginBottom: 16 }}>{lookupUrl}</div>
            <button className="btn btn-text" onClick={() => setShowQR(false)}>{t.common.close}</button>
          </div>
        </div>
      )}
    </div>
  )
}
