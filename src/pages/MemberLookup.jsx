import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useT } from '../lib/i18n'

export default function MemberLookup() {
  const { t } = useT()
  const lp = t.lookupPage
  const [phone, setPhone] = useState('')
  const [searching, setSearching] = useState(false)
  const [member, setMember] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [notFound, setNotFound] = useState(false)

  const handleLookup = async () => {
    const q = phone.trim()
    if (!q) return
    setSearching(true)
    setNotFound(false)
    setMember(null)
    setPurchases([])

    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, preferred_size')
      .ilike('phone', q)
      .limit(1)

    if (!customers || customers.length === 0) {
      setNotFound(true)
      setSearching(false)
      return
    }

    const found = customers[0]
    setMember(found)

    const { data: items } = await supabase
      .from('items')
      .select('id, name, category, era, sold_price, sold_at')
      .eq('customer_id', found.id)
      .order('sold_at', { ascending: false })

    setPurchases(items || [])
    setSearching(false)
  }

  const total = purchases.reduce((s, i) => s + (i.sold_price || 0), 0)

  return (
    <div style={{ minHeight: '100vh', background: '#F7F5F0', maxWidth: 480, margin: '0 auto', padding: '40px 24px 60px' }}>
      <div style={{ fontSize: 11, letterSpacing: '0.15em', color: '#888', marginBottom: 8, textTransform: 'uppercase' }}>{lp.title}</div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.04em', color: '#141414', marginBottom: 32 }}>{lp.brand}</div>

      <div style={{ marginBottom: 24 }}>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLookup()}
          placeholder={lp.phonePH}
          style={{ width: '100%', marginBottom: 10 }}
          autoFocus
        />
        <button className="btn btn-primary" onClick={handleLookup} disabled={searching} style={{ width: '100%' }}>
          {searching ? lp.searching : lp.submit}
        </button>
      </div>

      {notFound && (
        <div style={{ color: '#888', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>{lp.notFound}</div>
      )}

      {member && (
        <>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.02em' }}>{member.name}</div>
            {member.preferred_size && (
              <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>SIZE {member.preferred_size}</div>
            )}
          </div>

          {purchases.length > 0 && (
            <div style={{ fontSize: 13, color: '#8B6914', fontWeight: 600, marginBottom: 12, letterSpacing: '0.03em' }}>
              {lp.total(total)}
            </div>
          )}

          <div style={{ fontSize: 12, color: '#aaa', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
            {lp.historyTitle}
          </div>

          {purchases.length === 0 ? (
            <div style={{ color: '#888', fontSize: 14, padding: '16px 0' }}>{lp.noHistory}</div>
          ) : purchases.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #E8E6E0' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
                  {[item.era, item.category].filter(Boolean).join(' · ')}
                  {item.sold_at && ` · ${item.sold_at.slice(0, 7)}`}
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#8B6914' }}>${item.sold_price}</div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
