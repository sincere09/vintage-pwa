import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useT } from '../lib/i18n'

export default function Market() {
  const { t } = useT()
  const [sessions, setSessions] = useState([])
  const [active, setActive] = useState(null)
  const [sessionItems, setSessionItems] = useState([])
  const [allItems, setAllItems] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newBooth, setNewBooth] = useState('')
  const [editingBooth, setEditingBooth] = useState(false)
  const [boothInput, setBoothInput] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())

  const profitRate = parseFloat(localStorage.getItem('profit_rate') ?? '30') / 100
  const costs = JSON.parse(localStorage.getItem('cost_items') || '[]')
  const monthlySales = parseInt(localStorage.getItem('monthly_sales') || '20')
  const overheadPerItem = costs.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0) / (monthlySales || 1)

  useEffect(() => { fetchSessions() }, [])
  useEffect(() => { if (active) fetchSessionItems() }, [active])

  async function fetchSessions() {
    const { data } = await supabase.from('market_sessions').select('*').order('created_at', { ascending: false })
    setSessions(data || [])
    if (data?.length > 0 && !active) setActive(data[0])
  }

  async function fetchSessionItems() {
    const { data } = await supabase.from('market_session_items').select('*, items(*)').eq('session_id', active.id).order('created_at')
    setSessionItems(data || [])
  }

  async function createSession() {
    if (!newName.trim()) return
    const { data } = await supabase.from('market_sessions').insert({
      name: newName.trim(),
      date: new Date().toISOString().split('T')[0],
      booth_fee: parseFloat(newBooth) || 0,
    }).select().single()
    setShowNew(false); setNewName(''); setNewBooth('')
    setActive(data); fetchSessions()
  }

  async function saveBooth() {
    const fee = parseFloat(boothInput) || 0
    await supabase.from('market_sessions').update({ booth_fee: fee }).eq('id', active.id)
    setActive(prev => ({ ...prev, booth_fee: fee }))
    setSessions(prev => prev.map(s => s.id === active.id ? { ...s, booth_fee: fee } : s))
    setEditingBooth(false)
  }

  async function deleteSession() {
    if (!window.confirm(t.market.confirmDelete(active.name))) return
    await supabase.from('market_session_items').delete().eq('session_id', active.id)
    await supabase.from('market_sessions').delete().eq('id', active.id)
    setActive(null)
    setSessions(prev => {
      const next = prev.filter(s => s.id !== active.id)
      if (next.length > 0) setActive(next[0])
      return next
    })
    setSessionItems([])
  }

  async function openAddItem() {
    const { data } = await supabase.from('items').select('*').eq('status', 'available').order('name')
    setAllItems(data || [])
    setSelectedIds(new Set())
    setShowAdd(true)
  }

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  async function addSelected() {
    const alreadyIds = new Set(sessionItems.map(i => i.item_id))
    const toAdd = [...selectedIds].filter(id => !alreadyIds.has(id))
    if (!toAdd.length) return
    await supabase.from('market_session_items').insert(toAdd.map(id => ({ session_id: active.id, item_id: id })))
    setShowAdd(false)
    fetchSessionItems()
  }

  async function toggle(si) {
    await supabase.from('market_session_items').update({ returned: !si.returned }).eq('id', si.id)
    fetchSessionItems()
  }

  async function remove(si) {
    await supabase.from('market_session_items').delete().eq('id', si.id)
    fetchSessionItems()
  }

  const inCount = sessionItems.filter(i => !i.returned).length
  const boothFee = active?.booth_fee || 0
  const perItemFee = sessionItems.length > 0 ? boothFee / sessionItems.length : 0

  return (
    <div>
      <h1>{t.market.title}</h1>

      <div className="market-tabs">
        {sessions.map(s => (
          <button key={s.id} className={`market-tab ${active?.id === s.id ? 'active' : ''}`} onClick={() => setActive(s)}>{s.name}</button>
        ))}
        <button className="market-tab-new" onClick={() => setShowNew(true)}>＋ {t.market.newMarket.replace('＋ ', '')}</button>
      </div>

      {active ? (
        <>
          <div className="booth-row">
            <span className="booth-label">{t.market.boothFee}</span>
            {editingBooth ? (
              <>
                <input className="booth-input" type="number" value={boothInput} onChange={e => setBoothInput(e.target.value)} autoFocus placeholder="0" />
                <button className="booth-save" onClick={saveBooth}>{t.common.confirm}</button>
                <button className="booth-cancel" onClick={() => setEditingBooth(false)}>✕</button>
              </>
            ) : (
              <>
                <span className="booth-value">${boothFee}</span>
                <button className="booth-edit" onClick={() => { setBoothInput(boothFee); setEditingBooth(true) }}>{t.market.edit}</button>
              </>
            )}
            {boothFee > 0 && sessionItems.length > 0 && (
              <span className="booth-split">{t.market.splitPerItem(perItemFee.toFixed(0))}</span>
            )}
          </div>

          {sessionItems.length > 0 && (
            <div className="summary">{t.market.summary(sessionItems.length, inCount, sessionItems.length - inCount)}</div>
          )}

          {sessionItems.map(si => {
            const itemTotalCost = (si.items?.cost_price || 0) + (si.items?.shipping_cost || 0) + (si.items?.packaging_cost || 0)
            const minPrice = Math.ceil((itemTotalCost + overheadPerItem + perItemFee) * (1 + profitRate))
            return (
              <div key={si.id} className="market-item">
                <input type="checkbox" checked={si.returned} onChange={() => toggle(si)} />
                <div className="market-item-info">
                  <div className={`market-item-name ${si.returned ? 'done' : ''}`}>{si.items?.name}</div>
                  <div className="market-item-meta">
                    {t.market.itemMeta(si.items?.selling_price, Math.ceil(minPrice))}
                    {si.returned ? ` · ${t.market.returned}` : ''}
                  </div>
                </div>
                <button className="remove-btn" onClick={() => remove(si)}>✕</button>
              </div>
            )
          })}
          {sessionItems.length === 0 && <div className="empty">{t.market.empty}</div>}
          <button className="fab" onClick={openAddItem}>＋</button>

          <div style={{ padding: '24px 16px 8px' }}>
            <button className="btn btn-danger" onClick={deleteSession}>{t.market.deleteSession}</button>
          </div>
        </>
      ) : (
        <div className="empty">{t.market.empty}</div>
      )}

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{t.market.newModal}</h2>
            <div className="form-group">
              <label>{t.market.sessionName}</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={t.market.sessionPlaceholder} autoFocus />
            </div>
            <div className="form-group">
              <label>{t.market.boothFee}</label>
              <input type="number" value={newBooth} onChange={e => setNewBooth(e.target.value)} placeholder="0" />
            </div>
            <div className="modal-actions">
              <button className="btn btn-text" onClick={() => setShowNew(false)}>{t.common.cancel}</button>
              <button className="btn btn-primary" onClick={createSession}>{t.market.create}</button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{t.market.addModal}</h2>
            {allItems.length === 0
              ? <div className="empty" style={{ padding: '20px 0' }}>{t.market.noAvailable}</div>
              : <>
                {(() => {
                  const selectableIds = allItems.filter(i => !sessionItems.some(s => s.item_id === i.id)).map(i => i.id)
                  const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedIds.has(id))
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0 12px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}
                      onClick={() => setSelectedIds(allSelected ? new Set() : new Set(selectableIds))}>
                      <input type="checkbox" checked={allSelected} readOnly style={{ width: 18, height: 18, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{allSelected ? '取消全選' : '全選'}</span>
                    </div>
                  )
                })()}
                {allItems.map(item => {
                  const alreadyIn = sessionItems.some(i => i.item_id === item.id)
                  const checked = selectedIds.has(item.id)
                  return (
                    <div
                      key={item.id}
                      className="modal-item"
                      onClick={() => !alreadyIn && toggleSelect(item.id)}
                      style={{ opacity: alreadyIn ? 0.4 : 1 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input type="checkbox" checked={checked} readOnly disabled={alreadyIn} style={{ flexShrink: 0, width: 18, height: 18 }} />
                        {item.photo_url
                          ? <img src={item.photo_url} alt="" style={{ width: 44, height: 44, objectFit: 'cover', flexShrink: 0, borderRadius: 2 }} loading="lazy" />
                          : <div style={{ width: 44, height: 44, background: 'var(--surface)', flexShrink: 0, borderRadius: 2 }} />
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="modal-item-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                          <div className="modal-item-meta">
                            {[item.category, item.material, `$${item.selling_price}`].filter(Boolean).join(' · ')}
                            {alreadyIn && ` · ${t.market.alreadyAdded}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                </>
            }
            <div className="modal-actions">
              <button className="btn btn-text" onClick={() => setShowAdd(false)}>{t.common.cancel}</button>
              <button className="btn btn-primary" onClick={addSelected} disabled={selectedIds.size === 0}>
                {selectedIds.size > 0 ? t.market.addSelected(selectedIds.size) : t.common.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
