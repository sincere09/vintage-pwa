import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/compress'
import { formatMeasurements } from '../lib/measurements'
import { analyzeFit } from '../lib/fitAnalysis'
import { useT } from '../lib/i18n'

function generateText(item, t) {
  const header = [item.era, item.category].filter(Boolean).join(' · ')
  const measures = [
    item.shoulder && `${t.add.shoulder} ${item.shoulder}`,
    item.chest && `${t.add.chest} ${item.chest}`,
    item.clothes_length && `${t.add.length} ${item.clothes_length}`,
    item.sleeve && `${t.add.sleeve} ${item.sleeve}`,
  ].filter(Boolean)
  const measureLine = measures.length
    ? measures.slice(0, 2).join(' · ') + (measures.length > 2 ? '\n' + measures.slice(2).join(' · ') : '')
    : ''
  const fitKey = analyzeFit(item)
  const fitLine = fitKey ? t.fit[fitKey] : ''

  const paragraphs = [
    header ? `${header}\n${item.name}` : item.name,
    fitLine,
    measureLine,
    item.material,
    `$ ${item.selling_price}`,
    item.description,
  ].filter(Boolean)

  return paragraphs.join('\n\n')
}

export default function ItemDetail({ id, onBack }) {
  const { t } = useT()
  const [item, setItem] = useState(null)
  const [soldPrice, setSoldPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [viewBumped, setViewBumped] = useState(false)
  const [viewDipped, setViewDipped] = useState(false)
  const [customers, setCustomers] = useState([])
  const [customerId, setCustomerId] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [editSaving, setEditSaving] = useState(false)
  const fileRef = useRef()

  const profitRate = parseFloat(localStorage.getItem('profit_rate') ?? '30') / 100
  const costs = JSON.parse(localStorage.getItem('cost_items') || '[]')
  const monthlySales = parseInt(localStorage.getItem('monthly_sales') || '20')
  const overheadPerItem = costs.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0) / (monthlySales || 1)

  useEffect(() => { fetchItem(); fetchCustomers() }, [id])

  const bumpView = async () => {
    await supabase.rpc('increment_view_count', { item_id: id })
    setItem(prev => prev ? { ...prev, view_count: (prev.view_count || 0) + 1 } : prev)
    setViewBumped(true)
    setTimeout(() => setViewBumped(false), 800)
  }

  const dipView = async () => {
    if (!item.view_count) return
    await supabase.rpc('decrement_view_count', { item_id: id })
    setItem(prev => prev ? { ...prev, view_count: Math.max((prev.view_count || 0) - 1, 0) } : prev)
    setViewDipped(true)
    setTimeout(() => setViewDipped(false), 800)
  }

  async function fetchCustomers() {
    const { data } = await supabase.from('customers').select('id, name').order('name')
    setCustomers(data || [])
  }

  async function fetchItem() {
    const { data } = await supabase.from('items').select('*').eq('id', id).single()
    setItem(data)
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const compressed = await compressImage(file)
      const fileName = `${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage.from('photos').upload(fileName, compressed, { contentType: 'image/jpeg' })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('photos').getPublicUrl(fileName)
      await supabase.from('items').update({ photo_url: data.publicUrl }).eq('id', id)
      fetchItem()
    } catch (e) {
      alert('換圖失敗：' + e.message)
    }
    setUploading(false)
  }

  const markSold = async () => {
    const price = parseFloat(soldPrice) || item.selling_price
    if (!window.confirm(t.detail.confirmSold(price, price - totalCost))) return
    setLoading(true)
    await supabase.from('items').update({
      status: 'sold', sold_price: price, sold_at: new Date().toISOString(),
      customer_id: customerId || null,
    }).eq('id', id)
    setLoading(false)
    onBack()
  }

  const openEdit = () => {
    setEditForm({
      name: item.name || '',
      era: item.era || '',
      category: item.category || '',
      material: item.material || '',
      shoulder: item.shoulder ?? '',
      chest: item.chest ?? '',
      clothes_length: item.clothes_length ?? '',
      sleeve: item.sleeve ?? '',
      cost_price: item.cost_price ?? '',
      shipping_cost: item.shipping_cost ?? '',
      packaging_cost: item.packaging_cost ?? '',
      selling_price: item.selling_price ?? '',
      description: item.description || '',
    })
    setShowEdit(true)
  }

  const saveEdit = async () => {
    if (!editForm.name.trim()) return
    setEditSaving(true)
    await supabase.from('items').update({
      name: editForm.name.trim(),
      era: editForm.era,
      category: editForm.category,
      material: editForm.material,
      shoulder: parseFloat(editForm.shoulder) || null,
      chest: parseFloat(editForm.chest) || null,
      clothes_length: parseFloat(editForm.clothes_length) || null,
      sleeve: parseFloat(editForm.sleeve) || null,
      cost_price: parseFloat(editForm.cost_price) || 0,
      shipping_cost: parseFloat(editForm.shipping_cost) || 0,
      packaging_cost: parseFloat(editForm.packaging_cost) || 0,
      selling_price: parseFloat(editForm.selling_price) || 0,
      description: editForm.description.trim(),
    }).eq('id', id)
    setEditSaving(false)
    setShowEdit(false)
    fetchItem()
  }

  const ef = (k, v) => setEditForm(f => ({ ...f, [k]: v }))

  const deleteItem = async () => {
    if (!window.confirm(t.detail.confirmDelete)) return
    await supabase.from('items').delete().eq('id', id)
    onBack()
  }

  if (!item) return <div className="loading">{t.common.loading}</div>

  const fitKey = analyzeFit(item)
  const totalCost = item.cost_price + (item.shipping_cost || 0) + (item.packaging_cost || 0)
  const salePrice = item.status === 'sold' ? item.sold_price : item.selling_price
  const profit = salePrice - totalCost
  const minPrice = Math.ceil((totalCost + overheadPerItem) * (1 + profitRate))

  return (
    <>
    <div>
      <button className="back-btn" onClick={onBack}>{t.common.back}</button>

      <div style={{ position: 'relative' }}>
        {item.photo_url ? <img src={item.photo_url} className="detail-photo" alt="" /> : <div className="detail-photo" />}
        <button className="change-photo-btn" onClick={() => fileRef.current.click()} disabled={uploading}>
          {uploading ? t.detail.uploading : t.detail.changePhoto}
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
      </div>

      <div className="detail-content">
        <div className="detail-header">
          <div className="detail-name">{item.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`badge ${item.status === 'sold' ? 'badge-sold' : 'badge-available'}`}>
              {item.status === 'sold' ? t.detail.statusSold : t.detail.statusAvailable}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--gold)' }}>
              <button onClick={dipView} disabled={!item.view_count}
                style={{ padding: '4px 10px', background: viewDipped ? 'var(--gold)' : 'transparent', color: viewDipped ? '#fff' : 'var(--gold)', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                −
              </button>
              <span style={{ padding: '4px 6px', fontSize: 13, color: 'var(--gold)', fontWeight: 600, minWidth: 28, textAlign: 'center' }}>
                👁 {item.view_count || 0}
              </span>
              <button onClick={bumpView}
                style={{ padding: '4px 10px', background: viewBumped ? 'var(--gold)' : 'transparent', color: viewBumped ? '#fff' : 'var(--gold)', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                ＋
              </button>
            </div>
          </div>
        </div>
        <div className="detail-meta">
          {[item.era, item.category, item.material].filter(Boolean).join(' · ')}
        </div>
        <div className="measure-row">
          {item.shoulder && <span className="measure-tag">{t.add.shoulder} {item.shoulder}cm</span>}
          {item.chest && <span className="measure-tag">{t.add.chest} {item.chest}cm</span>}
          {item.clothes_length && <span className="measure-tag">{t.add.length} {item.clothes_length}cm</span>}
          {item.sleeve && <span className="measure-tag">{t.add.sleeve} {item.sleeve}cm</span>}
          {fitKey && (
            <span className="measure-tag" style={{ background: '#141414', color: '#F7F5F0', borderColor: '#141414' }}>
              {t.fit[fitKey]}
            </span>
          )}
        </div>

        <div className="cost-breakdown">
          <span>{t.add.buyPrice} ${item.cost_price}</span>
          {(item.shipping_cost > 0) && <span>＋ {t.add.shipping} ${item.shipping_cost}</span>}
          {(item.packaging_cost > 0) && <span>＋ {t.add.packaging} ${item.packaging_cost}</span>}
          <span className="cost-breakdown-total">＝ {t.detail.cost} ${totalCost}</span>
        </div>

        <div className="price-row">
          <div className="price-box">
            <div className="price-label">{t.detail.cost}</div>
            <div className="price-value">${totalCost}</div>
          </div>
          <div className="price-box">
            <div className="price-label">{t.detail.minPrice}</div>
            <div className="price-value" style={{ color: '#e67e00' }}>${minPrice}</div>
          </div>
          <div className="price-box">
            <div className="price-label">{item.status === 'sold' ? t.detail.soldPrice : t.detail.listPrice}</div>
            <div className="price-value" style={{ color: '#8B6914' }}>${salePrice}</div>
          </div>
          <div className="price-box">
            <div className="price-label">{t.detail.profit}</div>
            <div className="price-value" style={{ color: profit >= 0 ? '#2d7a2d' : '#cc0000' }}>${profit}</div>
          </div>
        </div>

        {item.description && <div className="sell-section" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>{t.detail.notes}</div>
          <div style={{ fontSize: 15, lineHeight: 1.6 }}>{item.description}</div>
        </div>}

        {item.status === 'available' && (
          <div className="sell-section">
            <div className="section-title">{t.detail.sellSection}</div>
            <div className="form-group">
              <label>{t.detail.soldAmtLabel(item.selling_price)}</label>
              <input type="number" value={soldPrice} onChange={e => setSoldPrice(e.target.value)} placeholder={`${item.selling_price}`} />
            </div>
            {customers.length > 0 && (
              <div className="form-group">
                <label>購買會員（選填）</label>
                <select value={customerId} onChange={e => setCustomerId(e.target.value)}>
                  <option value="">— 非會員 —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <button className="btn btn-success" onClick={markSold} disabled={loading}>
              {loading ? t.detail.processing : t.detail.markSold}
            </button>
          </div>
        )}

        <div style={{ height: 12 }} />
        <div className="sell-section" style={{ marginBottom: 1 }}>
          <div className="section-title">文案生成</div>
          <div className="generated-text">{generateText(item, t)}</div>
          <div style={{ height: 10 }} />
          <button className="btn btn-copy" onClick={() => {
            navigator.clipboard.writeText(generateText(item, t))
            setCopied(true); setTimeout(() => setCopied(false), 1500)
          }}>
            {copied ? '✓ 已複製' : '複製文案'}
          </button>
        </div>
        <div style={{ height: 1 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-text" style={{ flex: 1 }} onClick={openEdit}>{t.detail.editItem}</button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={deleteItem}>{t.detail.deleteItem}</button>
        </div>
      </div>
    </div>
    {showEdit && (
      <div className="modal-overlay" onClick={() => setShowEdit(false)}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
          <h2>{t.detail.editItem}</h2>
          <div className="form-group">
            <label>{t.add.name}</label>
            <input value={editForm.name} onChange={e => ef('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t.add.era}</label>
            <select value={editForm.era} onChange={e => ef('era', e.target.value)}>
              {t.eras.map(e => <option key={e} value={e}>{e || '—'}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>{t.add.category}</label>
            <select value={editForm.category} onChange={e => ef('category', e.target.value)}>
              {['上衣','下著','外套','洋裝','配件','鞋子','其他'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>{t.add.material}</label>
            <select value={editForm.material} onChange={e => ef('material', e.target.value)}>
              <option value="">—</option>
              {t.materials.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="row">
            <div className="form-group">
              <label>{t.add.shoulder}</label>
              <input type="number" value={editForm.shoulder} onChange={e => ef('shoulder', e.target.value)} placeholder="42" />
            </div>
            <div className="form-group">
              <label>{t.add.chest}</label>
              <input type="number" value={editForm.chest} onChange={e => ef('chest', e.target.value)} placeholder="50" />
            </div>
          </div>
          <div className="row">
            <div className="form-group">
              <label>{t.add.length}</label>
              <input type="number" value={editForm.clothes_length} onChange={e => ef('clothes_length', e.target.value)} placeholder="65" />
            </div>
            <div className="form-group">
              <label>{t.add.sleeve}</label>
              <input type="number" value={editForm.sleeve} onChange={e => ef('sleeve', e.target.value)} placeholder="60" />
            </div>
          </div>
          <div className="row">
            <div className="form-group">
              <label>{t.add.buyPrice}</label>
              <input type="number" value={editForm.cost_price} onChange={e => ef('cost_price', e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t.add.shipping}</label>
              <input type="number" value={editForm.shipping_cost} onChange={e => ef('shipping_cost', e.target.value)} />
            </div>
          </div>
          <div className="row">
            <div className="form-group">
              <label>{t.add.packaging}</label>
              <input type="number" value={editForm.packaging_cost} onChange={e => ef('packaging_cost', e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t.add.sellPrice}</label>
              <input type="number" value={editForm.selling_price} onChange={e => ef('selling_price', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>{t.add.notes}</label>
            <textarea value={editForm.description} onChange={e => ef('description', e.target.value)} rows={3} />
          </div>
          <div className="modal-actions">
            <button className="btn btn-text" onClick={() => setShowEdit(false)}>{t.common.cancel}</button>
            <button className="btn btn-primary" onClick={saveEdit} disabled={editSaving}>
              {editSaving ? t.detail.editSaving : t.detail.editSave}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
