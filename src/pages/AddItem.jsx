import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/compress'
import { useT } from '../lib/i18n'

export default function AddItem() {
  const { t } = useT()
  const [name, setName] = useState('')
  const [cat, setCat] = useState(t.addCats[0])
  const [era, setEra] = useState('')
  const [shoulder, setShoulder] = useState('')
  const [chest, setChest] = useState('')
  const [clothesLength, setClothesLength] = useState('')
  const [sleeve, setSleeve] = useState('')
  const [materials, setMaterials] = useState([{ type: '', percent: '' }])
  const [cost, setCost] = useState('')
  const [shipping, setShipping] = useState('')
  const [totalShipping, setTotalShipping] = useState('')
  const [shippingQty, setShippingQty] = useState('')
  const [packaging, setPackaging] = useState('')
  const [tripItems, setTripItems] = useState([])
  const [tripQty, setTripQty] = useState('')
  const [newTripName, setNewTripName] = useState('')
  const [newTripAmt, setNewTripAmt] = useState('')
  const [sell, setSell] = useState('')
  const [desc, setDesc] = useState('')
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const fileRef = useRef()

  const costNum = parseFloat(cost) || 0
  const shippingNum = parseFloat(shipping) || 0
  const packagingNum = parseFloat(packaging) || 0
  const tripTotal = tripItems.reduce((s, t2) => s + (parseFloat(t2.amount) || 0), 0)
  const tripPerItem = tripTotal > 0 && parseInt(tripQty) > 0 ? tripTotal / parseInt(tripQty) : 0
  const totalCost = costNum + shippingNum + packagingNum + tripPerItem
  const profitRate = parseFloat(localStorage.getItem('profit_rate') ?? '30') / 100
  const overheadCosts = JSON.parse(localStorage.getItem('cost_items') || '[]')
  const monthlySales = parseInt(localStorage.getItem('monthly_sales') || '20')
  const overheadPerItem = overheadCosts.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0) / (monthlySales || 1)
  const minPrice = totalCost > 0 ? Math.ceil((totalCost + overheadPerItem) * (1 + profitRate)) : 0
  const totalPercent = materials.reduce((s, m) => s + (parseInt(m.percent) || 0), 0)
  const materialStr = materials.filter(m => m.type).map(m => m.percent ? `${m.percent}% ${m.type}` : m.type).join(' · ')

  const calcShipping = () => {
    const perItem = parseFloat(totalShipping) / (parseInt(shippingQty) || 1)
    if (!isNaN(perItem)) setShipping(perItem.toFixed(1))
  }

  const updateMaterial = (i, field, val) => setMaterials(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: val } : m))
  const addMaterial = () => setMaterials(prev => [...prev, { type: '', percent: '' }])
  const removeMaterial = (i) => setMaterials(prev => prev.filter((_, idx) => idx !== i))

  const addTripItem = (name) => {
    const n = name || newTripName.trim()
    if (!n) return
    setTripItems(prev => [...prev, { name: n, amount: parseFloat(newTripAmt) || 0 }])
    setNewTripName(''); setNewTripAmt('')
  }
  const updateTripAmt = (i, val) => setTripItems(prev => prev.map((t2, idx) => idx === i ? { ...t2, amount: val } : t2))
  const removeTripItem = (i) => setTripItems(prev => prev.filter((_, idx) => idx !== i))

  const handlePhoto = e => {
    const file = e.target.files[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const uploadPhoto = async (file) => {
    const compressed = await compressImage(file)
    const fileName = `${Date.now()}.jpg`
    const { error } = await supabase.storage.from('photos').upload(fileName, compressed, { contentType: 'image/jpeg' })
    if (error) throw error
    const { data } = supabase.storage.from('photos').getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleSave = async () => {
    if (!name.trim()) { alert(t.add.alertName); return }
    setLoading(true)
    try {
      let photoUrl = ''
      if (photo) photoUrl = await uploadPhoto(photo)
      const zhCats = ['上衣', '下著', '外套', '洋裝', '配件', '鞋子', '其他']
      const catIdx = t.addCats.indexOf(cat)
      const zhCat = catIdx >= 0 ? zhCats[catIdx] : cat
      const { error } = await supabase.from('items').insert({
        name: name.trim(), category: zhCat,
        shoulder: parseFloat(shoulder) || null,
        chest: parseFloat(chest) || null,
        clothes_length: parseFloat(clothesLength) || null,
        sleeve: parseFloat(sleeve) || null,
        era: era,
        material: materialStr,
        cost_price: costNum,
        shipping_cost: shippingNum,
        packaging_cost: packagingNum,
        selling_price: parseFloat(sell) || 0,
        description: desc.trim(), photo_url: photoUrl, status: 'available',
      })
      if (error) throw error
      setName(''); setShoulder(''); setChest(''); setClothesLength(''); setSleeve('')
      setEra(''); setMaterials([{ type: '', percent: '' }]); setCost(''); setShipping('')
      setTotalShipping(''); setShippingQty(''); setPackaging('')
      setTripItems([]); setTripQty(''); setSell(''); setDesc('')
      setPhoto(null); setPreview(null)
      setDone(true)
      setTimeout(() => setDone(false), 2000)
    } catch (e) {
      alert(t.add.alertFail + e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <h1 style={{ paddingLeft: 0 }}>{t.add.title}</h1>

      <div className="photo-box" onClick={() => fileRef.current.click()}>
        {preview ? <img src={preview} alt="" /> : (
          <div className="photo-hint"><span className="icon">📷</span>{t.add.photoHint}</div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />

      <div className="form-group">
        <label>{t.add.name}</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder={t.add.namePlaceholder} />
      </div>

      <div className="form-group era-select-wrap">
        <label>{t.add.era}</label>
        <select value={era} onChange={e => setEra(e.target.value)}>
          {t.eras.map(e => <option key={e} value={e}>{e || '—'}</option>)}
        </select>
      </div>

      <label>{t.add.category}</label>
      <div className="cat-scroll">
        {t.addCats.map(c => <button key={c} className={`cat-chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>{c}</button>)}
      </div>

      <div className="measure-card">
        <div className="measure-card-title">{t.add.size}</div>
        <div className="row">
          <div className="form-group">
            <label>{t.add.shoulder}</label>
            <input type="number" value={shoulder} onChange={e => setShoulder(e.target.value)} placeholder="42" />
          </div>
          <div className="form-group">
            <label>{t.add.chest}</label>
            <input type="number" value={chest} onChange={e => setChest(e.target.value)} placeholder="50" />
          </div>
        </div>
        <div className="row">
          <div className="form-group">
            <label>{t.add.length}</label>
            <input type="number" value={clothesLength} onChange={e => setClothesLength(e.target.value)} placeholder="65" />
          </div>
          <div className="form-group">
            <label>{t.add.sleeve}</label>
            <input type="number" value={sleeve} onChange={e => setSleeve(e.target.value)} placeholder="60" />
          </div>
        </div>
        <div style={{ marginBottom: 0 }}>
          <label style={{ fontSize: 13, color: '#555', marginBottom: 6, display: 'block', fontWeight: 500 }}>
            {t.add.material}
            {totalPercent > 0 && (
              <span style={{ marginLeft: 8, color: totalPercent === 100 ? '#2d7a2d' : '#e67e00', fontWeight: 600 }}>
                {t.add.totalPercent(totalPercent)}
              </span>
            )}
          </label>
          {materials.map((m, i) => (
            <div key={i} className="material-row">
              <select className="material-select" value={m.type} onChange={e => updateMaterial(i, 'type', e.target.value)}>
                <option value="">{t.add.materialSelect}</option>
                {t.materials.map(mt => <option key={mt.value} value={mt.value}>{mt.label}</option>)}
              </select>
              <input className="material-percent" type="number" value={m.percent} onChange={e => updateMaterial(i, 'percent', e.target.value)} placeholder="%" min="1" max="100" />
              {materials.length > 1 && <button className="cost-del" onClick={() => removeMaterial(i)}>✕</button>}
            </div>
          ))}
          <button className="material-add-btn" onClick={addMaterial}>{t.add.materialAdd}</button>
          {materialStr && <div className="material-preview">{materialStr}</div>}
        </div>
      </div>

      <div className="cost-card">
        <div className="cost-card-title">{t.add.cost}</div>
        <div className="row">
          <div className="form-group">
            <label>{t.add.buyPrice}</label>
            <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="0" />
          </div>
          <div className="form-group">
            <label>{t.add.packaging}</label>
            <input type="number" value={packaging} onChange={e => setPackaging(e.target.value)} placeholder="0" />
          </div>
        </div>

        <div className="shipping-calc">
          <div className="shipping-calc-title">{t.add.shipping}</div>
          <div className="shipping-calc-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{t.add.totalShipping}</label>
              <input type="number" value={totalShipping} onChange={e => setTotalShipping(e.target.value)} placeholder="3000" />
            </div>
            <div className="shipping-divider">÷</div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{t.add.qty}</label>
              <input type="number" value={shippingQty} onChange={e => setShippingQty(e.target.value)} placeholder="100" />
            </div>
            <button className="shipping-calc-btn" onClick={calcShipping}>{t.add.apply}</button>
          </div>
          {shipping !== '' && <div className="shipping-result">{t.add.shippingResult(shippingNum)}</div>}
        </div>

        <div className="trip-calc">
          <div className="shipping-calc-title">{t.add.trip}</div>
          <div className="trip-presets">
            {t.add.tripPresets.map(p => (
              <button key={p} className="trip-preset-btn" onClick={() => setNewTripName(p)}>{p}</button>
            ))}
          </div>
          {tripItems.map((ti, i) => (
            <div key={i} className="trip-item-row">
              <span className="trip-item-name">{ti.name}</span>
              <input className="trip-item-input" type="number" value={ti.amount} onChange={e => updateTripAmt(i, e.target.value)} placeholder="0" />
              <button className="cost-del" onClick={() => removeTripItem(i)}>✕</button>
            </div>
          ))}
          <div className="shipping-calc-row" style={{ marginTop: 6 }}>
            <input style={{ flex: 1 }} value={newTripName} onChange={e => setNewTripName(e.target.value)} placeholder={t.add.tripPresets[5]} />
            <input className="trip-item-input" type="number" value={newTripAmt} onChange={e => setNewTripAmt(e.target.value)} placeholder="0" />
            <button className="shipping-calc-btn" onClick={() => addTripItem()}>＋</button>
          </div>
          {tripTotal > 0 && (
            <div className="form-group" style={{ marginTop: 10, marginBottom: 0 }}>
              <label>{t.add.tripQtyLabel}</label>
              <input type="number" value={tripQty} onChange={e => setTripQty(e.target.value)} placeholder="50" />
            </div>
          )}
          {tripPerItem > 0 && <div className="shipping-result">{t.add.tripResult(tripPerItem.toFixed(1), tripTotal, tripQty)}</div>}
        </div>

        <div className="cost-total">
          {t.add.totalCost} <strong>${totalCost.toFixed(0)}</strong>
          {totalCost > 0 && (
            <div className="cost-total-note">
              {t.add.buyPrice} ${costNum}
              {shippingNum > 0 && ` + ${t.add.shipping} $${shippingNum}`}
              {packagingNum > 0 && ` + ${t.add.packaging} $${packagingNum}`}
              {tripPerItem > 0 && ` + ${t.add.trip.split(' ')[0]} $${tripPerItem.toFixed(1)}`}
            </div>
          )}
        </div>
      </div>

      <div className="form-group">
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t.add.sellPrice}</span>
          {minPrice > 0 && <span style={{ color: '#e67e00', fontWeight: 600, fontSize: 13 }}>min ${minPrice}</span>}
        </label>
        <input type="number" value={sell} onChange={e => setSell(e.target.value)} placeholder={minPrice > 0 ? `${minPrice}` : '0'} />
      </div>

      <div className="form-group">
        <label>{t.add.notes}</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder={t.add.notesPlaceholder} />
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
        {loading ? t.add.saving : done ? t.add.done : t.add.submit}
      </button>
    </div>
  )
}
