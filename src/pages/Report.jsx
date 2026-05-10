import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function downloadCSV(filename, rows) {
  const bom = '﻿'
  const csv = bom + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function getMonthRange(year, month) {
  const start = new Date(year, month, 1).toISOString()
  const end = new Date(year, month + 1, 1).toISOString()
  return { start, end }
}

export default function Report() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [soldItems, setSoldItems] = useState([])
  const [inventory, setInventory] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  const costs = JSON.parse(localStorage.getItem('cost_items') || '[]')
  const monthlyOverhead = costs.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0)

  async function exportInventory() {
    const { data } = await supabase.from('items').select('*').eq('status', 'available').order('created_at', { ascending: false })
    const header = ['品名', '類別', '材質', '肩寬', '胸寬', '衣長', '袖長', '進價', '運費', '包材', '售價', '備註', '入庫日期']
    const rows = (data || []).map(i => [
      i.name, i.category, i.material,
      i.shoulder, i.chest, i.clothes_length, i.sleeve,
      i.cost_price, i.shipping_cost, i.packaging_cost, i.selling_price,
      i.description, i.created_at?.split('T')[0]
    ])
    downloadCSV('庫存清單.csv', [header, ...rows])
  }

  async function exportSales() {
    const { data } = await supabase.from('items').select('*').eq('status', 'sold').order('sold_at', { ascending: false })
    const header = ['品名', '類別', '材質', '進價', '運費', '包材', '定價', '實售價', '利潤', '售出日期']
    const rows = (data || []).map(i => {
      const totalCost = (i.cost_price || 0) + (i.shipping_cost || 0) + (i.packaging_cost || 0)
      return [
        i.name, i.category, i.material,
        i.cost_price, i.shipping_cost, i.packaging_cost,
        i.selling_price, i.sold_price, (i.sold_price || 0) - totalCost,
        i.sold_at?.split('T')[0]
      ]
    })
    downloadCSV('銷售記錄.csv', [header, ...rows])
  }

  useEffect(() => { fetchData() }, [year, month])

  async function fetchData() {
    setLoading(true)
    const { start, end } = getMonthRange(year, month)
    const [soldRes, invRes, sessRes] = await Promise.all([
      supabase.from('items').select('*').eq('status', 'sold').gte('sold_at', start).lt('sold_at', end),
      supabase.from('items').select('id, category').eq('status', 'available'),
      supabase.from('market_sessions').select('*, market_session_items(*, items(*))').gte('date', start.split('T')[0]).lt('date', end.split('T')[0]),
    ])
    setSoldItems(soldRes.data || [])
    setInventory(invRes.data || [])
    setSessions(sessRes.data || [])
    setLoading(false)
  }

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  const revenue = soldItems.reduce((s, i) => s + (i.sold_price || 0), 0)
  const cogs = soldItems.reduce((s, i) => s + (i.cost_price || 0) + (i.shipping_cost || 0) + (i.packaging_cost || 0), 0)
  const totalBoothFee = sessions.reduce((s, s2) => s + (s2.booth_fee || 0), 0)
  const grossProfit = revenue - cogs
  const netProfit = grossProfit - monthlyOverhead - totalBoothFee
  const margin = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : 0

  const catMap = {}
  soldItems.forEach(i => {
    const c = i.category || '其他'
    if (!catMap[c]) catMap[c] = { count: 0, revenue: 0, profit: 0 }
    catMap[c].count++
    catMap[c].revenue += i.sold_price || 0
    catMap[c].profit += (i.sold_price || 0) - (i.cost_price || 0) - (i.shipping_cost || 0) - (i.packaging_cost || 0)
  })
  const cats = Object.entries(catMap).sort((a, b) => b[1].revenue - a[1].revenue)
  const maxCatRevenue = cats[0]?.[1].revenue || 1

  const monthLabel = `${year} / ${String(month + 1).padStart(2, '0')}`

  return (
    <div>
      <h1>報表</h1>

      <div className="report-month-nav">
        <button className="month-btn" onClick={prevMonth}>‹</button>
        <span className="month-label">{monthLabel}</span>
        <button className="month-btn" onClick={nextMonth}>›</button>
      </div>

      {loading ? <div className="loading">載入中...</div> : (
        <>
          <div className="report-summary">
            <div className="report-card">
              <div className="report-card-label">營收</div>
              <div className="report-card-value">${revenue.toLocaleString()}</div>
            </div>
            <div className="report-card">
              <div className="report-card-label">商品成本</div>
              <div className="report-card-value" style={{ color: '#cc0000' }}>${cogs.toLocaleString()}</div>
            </div>
            <div className="report-card">
              <div className="report-card-label">毛利</div>
              <div className="report-card-value" style={{ color: grossProfit >= 0 ? '#2d7a2d' : '#cc0000' }}>${grossProfit.toLocaleString()}</div>
            </div>
            <div className="report-card highlight">
              <div className="report-card-label">淨利</div>
              <div className="report-card-value" style={{ color: netProfit >= 0 ? '#2d7a2d' : '#cc0000' }}>${netProfit.toLocaleString()}</div>
            </div>
          </div>

          <div className="report-overhead">
            毛利率 {margin}%
            {monthlyOverhead > 0 && ` · 固定成本 $${monthlyOverhead.toLocaleString()}`}
            {totalBoothFee > 0 && ` · 攤位費 $${totalBoothFee.toLocaleString()}`}
          </div>

          <div className="report-status">
            <div className="report-stat">
              <div className="report-stat-num">{soldItems.length}</div>
              <div className="report-stat-label">本月售出</div>
            </div>
            <div className="report-stat-divider" />
            <div className="report-stat">
              <div className="report-stat-num">{inventory.length}</div>
              <div className="report-stat-label">在庫</div>
            </div>
            <div className="report-stat-divider" />
            <div className="report-stat">
              <div className="report-stat-num">{soldItems.length > 0 ? Math.round(revenue / soldItems.length) : 0}</div>
              <div className="report-stat-label">均售價</div>
            </div>
          </div>

          {cats.length > 0 && (
            <div className="report-section">
              <div className="report-section-title">類別分析</div>
              {cats.map(([cat, d]) => (
                <div key={cat} className="report-cat-row">
                  <div className="report-cat-name">{cat}</div>
                  <div className="report-cat-bar-wrap">
                    <div className="report-cat-bar" style={{ width: `${(d.revenue / maxCatRevenue) * 100}%` }} />
                  </div>
                  <div className="report-cat-nums">
                    {d.count}件 · ${d.revenue.toLocaleString()}
                    <span style={{ color: d.profit >= 0 ? '#2d7a2d' : '#cc0000', marginLeft: 6 }}>
                      利 ${d.profit.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {sessions.length > 0 && (
            <div className="report-section">
              <div className="report-section-title">本月市集</div>
              {sessions.map(s => {
                const items = s.market_session_items || []
                const returned = items.filter(i => i.returned).length
                const sold = items.length - returned
                return (
                  <div key={s.id} className="report-session-row">
                    <div className="report-session-name">{s.name}</div>
                    <div className="report-session-meta">
                      帶出 {items.length} 件 · 售出 {sold} 件 · 回貨 {returned} 件
                      {s.booth_fee > 0 && ` · 攤位費 $${s.booth_fee}`}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {soldItems.length === 0 && cats.length === 0 && (
            <div className="empty">本月還沒有售出記錄</div>
          )}

          <div className="report-section">
            <div className="report-section-title">匯出資料</div>
            <div className="export-row">
              <button className="export-btn" onClick={exportInventory}>
                <span className="export-icon">📦</span>
                <div>
                  <div className="export-title">庫存清單</div>
                  <div className="export-desc">所有在庫商品</div>
                </div>
              </button>
              <button className="export-btn" onClick={exportSales}>
                <span className="export-icon">💰</span>
                <div>
                  <div className="export-title">銷售記錄</div>
                  <div className="export-desc">全部售出明細</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
