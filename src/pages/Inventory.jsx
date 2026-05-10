import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { formatMeasurements } from '../lib/measurements'
import { analyzeFit } from '../lib/fitAnalysis'
import { useT } from '../lib/i18n'

export default function Inventory({ onSelect }) {
  const { t } = useT()
  const { profitRate, overheadPerItem } = useMemo(() => {
    const rate = parseFloat(localStorage.getItem('profit_rate') ?? '30') / 100
    const costs = JSON.parse(localStorage.getItem('cost_items') || '[]')
    const sales = parseInt(localStorage.getItem('monthly_sales') || '20')
    return { profitRate: rate, overheadPerItem: costs.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0) / (sales || 1) }
  }, [])

  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('inv_cache') || '[]') } catch { return [] }
  })
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState(t.cats[0])
  const [loading, setLoading] = useState(true)
  const [swipedId, setSwipedId] = useState(null)
  const [showFilter, setShowFilter] = useState(false)
  const [fShoulder, setFShoulder] = useState('')
  const [fChest, setFChest] = useState('')
  const [fLength, setFLength] = useState('')
  const [fSleeve, setFSleeve] = useState('')
  const [fMaterial, setFMaterial] = useState('')
  const touchStartX = useRef(0)

  const hasFilter = fShoulder || fChest || fLength || fSleeve || fMaterial

  const clearFilter = () => { setFShoulder(''); setFChest(''); setFLength(''); setFSleeve(''); setFMaterial('') }

  useEffect(() => {
    const timer = setTimeout(() => fetchItems(), 300)
    return () => clearTimeout(timer)
  }, [cat, search, fShoulder, fChest, fLength, fSleeve, fMaterial])

  async function fetchItems() {
    const hasCached = items.length > 0
    if (!hasCached) setLoading(true)
    let q = supabase.from('items')
      .select('id,name,category,material,shoulder,chest,clothes_length,sleeve,era,cost_price,shipping_cost,packaging_cost,selling_price,photo_url,view_count,status')
      .eq('status', 'available').order('created_at', { ascending: false })
    if (cat !== t.cats[0]) {
      const zhCats = ['全部', '上衣', '下著', '外套', '洋裝', '配件', '鞋子', '其他']
      const idx = t.cats.indexOf(cat)
      if (idx > 0) q = q.eq('category', zhCats[idx])
    }
    if (search) q = q.ilike('name', `%${search}%`)
    if (fShoulder) q = q.gte('shoulder', parseFloat(fShoulder))
    if (fChest) q = q.gte('chest', parseFloat(fChest))
    if (fLength) q = q.gte('clothes_length', parseFloat(fLength))
    if (fSleeve) q = q.gte('sleeve', parseFloat(fSleeve))
    if (fMaterial) q = q.ilike('material', `%${fMaterial}%`)
    const { data } = await q
    const result = data || []
    setItems(result)
    setLoading(false)
    if (!search && !hasFilter && cat === t.cats[0]) {
      localStorage.setItem('inv_cache', JSON.stringify(result))
    }
  }

  async function deleteItem(id) {
    if (!window.confirm(t.inventory.confirmDelete)) return
    await supabase.from('items').delete().eq('id', id)
    setSwipedId(null)
    fetchItems()
  }

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e, id) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    if (deltaX < -60) setSwipedId(id)
    else if (deltaX > 30) setSwipedId(null)
  }

  return (
    <div>
      <h1>{t.inventory.title}</h1>
      <input className="search-bar" placeholder={t.inventory.search} value={search} onChange={e => setSearch(e.target.value)} />
      <div className="chips" style={{ display: 'flex', alignItems: 'center' }}>
        {t.cats.map(c => <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>{c}</button>)}
        <button
          className={`chip ${showFilter || hasFilter ? 'active' : ''}`}
          style={{ marginLeft: 'auto', flexShrink: 0 }}
          onClick={() => setShowFilter(v => !v)}
        >
          {t.inventory.filter}{hasFilter ? ' ●' : ''}
        </button>
      </div>

      {showFilter && (
        <div style={{ padding: '10px 16px 4px', background: '#fff', borderBottom: '1px solid #eee' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', marginBottom: 8 }}>
            {[
              [t.add.shoulder, fShoulder, setFShoulder],
              [t.add.chest, fChest, setFChest],
              [t.add.length, fLength, setFLength],
              [t.add.sleeve, fSleeve, setFSleeve],
            ].map(([label, val, set]) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>{label} ({t.inventory.filterHint})</div>
                <input type="number" value={val} onChange={e => set(e.target.value)} placeholder="—" style={{ width: '100%' }} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>{t.add.material}</div>
            <select value={fMaterial} onChange={e => setFMaterial(e.target.value)} style={{ width: '100%' }}>
              <option value="">—</option>
              {t.materials.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          {hasFilter && (
            <button className="btn btn-text" style={{ fontSize: 12, padding: '4px 0', marginBottom: 4 }} onClick={clearFilter}>
              {t.inventory.clearFilter}
            </button>
          )}
        </div>
      )}
      {loading ? <div className="loading">{t.common.loading}</div> : items.length === 0 ? (
        <div className="empty">{t.inventory.noItems}</div>
      ) : items.map(item => (
        <div key={item.id} style={{ position: 'relative', overflow: 'hidden' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={e => handleTouchEnd(e, item.id)}
        >
          <div
            className="card"
            style={{ cursor: 'pointer', transform: swipedId === item.id ? 'translateX(-72px)' : 'translateX(0)', transition: 'transform 0.2s', userSelect: 'none' }}
            onClick={() => { if (swipedId === item.id) { setSwipedId(null); return } onSelect(item.id) }}
          >
            <div className="card-row">
              {item.photo_url ? <img src={item.photo_url} className="card-thumb" alt="" loading="lazy" /> : <div className="thumb-placeholder">{t.common.noPhoto}</div>}
              <div className="card-info">
                <div className="card-name">{item.name}</div>
                <div className="card-meta">
                  {item.category}{item.material ? ` · ${item.material}` : ''}
                  {(() => { const f = analyzeFit(item); return f ? <span style={{ marginLeft: 6, padding: '1px 6px', background: '#141414', color: '#F7F5F0', fontSize: 10, letterSpacing: '0.05em' }}>{t.fit[f]}</span> : null })()}
                </div>
                <div className="card-meta">{formatMeasurements(item)}</div>
                <div className="card-price" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    {t.inventory.price(item.selling_price, item.cost_price)}
                    {(() => {
                      const totalCost = (item.cost_price || 0) + (item.shipping_cost || 0) + (item.packaging_cost || 0)
                      const minPrice = Math.ceil((totalCost + overheadPerItem) * (1 + profitRate))
                      return <span style={{ color: '#e67e00', marginLeft: 6, fontSize: 12 }}>min ${minPrice}</span>
                    })()}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.03em' }}>
                    {item.view_count > 0 ? `👁 ${item.view_count}` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <button
            style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: 72,
              background: '#cc0000', color: '#fff', border: 'none', fontSize: 13,
              fontWeight: 600, letterSpacing: '0.05em', cursor: 'pointer',
              opacity: swipedId === item.id ? 1 : 0, pointerEvents: swipedId === item.id ? 'auto' : 'none',
              transition: 'opacity 0.2s'
            }}
            onClick={() => deleteItem(item.id)}
          >
            {t.common.delete}
          </button>
        </div>
      ))}
    </div>
  )
}
