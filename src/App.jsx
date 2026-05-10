import { useState, useRef, useEffect, useCallback, memo, lazy, Suspense } from 'react'
import { useT } from './lib/i18n'

const Inventory = lazy(() => import('./pages/Inventory'))
const AddItem   = lazy(() => import('./pages/AddItem'))
const Market    = lazy(() => import('./pages/Market'))
const ItemDetail= lazy(() => import('./pages/ItemDetail'))
const Report    = lazy(() => import('./pages/Report'))
const Members   = lazy(() => import('./pages/Members'))
const Settings  = lazy(() => import('./pages/Settings'))

const TAB_IDS = ['inventory', 'add', 'market', 'report', 'members', 'settings']

const MemoInventory = memo(Inventory)
const MemoAddItem   = memo(AddItem)
const MemoMarket    = memo(Market)
const MemoReport    = memo(Report)
const MemoMembers   = memo(Members)
const MemoSettings  = memo(Settings)

export default function App() {
  const [tab, setTab] = useState('inventory')
  const [selectedId, setSelectedId] = useState(null)
  const [visited, setVisited] = useState(() => new Set(['inventory']))
  const { t } = useT()
  const tabRef = useRef(tab)
  const selectedRef = useRef(selectedId)

  useEffect(() => { tabRef.current = tab }, [tab])
  useEffect(() => { selectedRef.current = selectedId }, [selectedId])

  const switchTab = useCallback((id) => {
    setVisited(v => { const n = new Set(v); n.add(id); return n })
    setTab(id)
  }, [])

  const handleSelect = useCallback((id) => setSelectedId(id), [])
  const handleBack   = useCallback(() => setSelectedId(null), [])

  useEffect(() => {
    let startX = 0, startY = 0
    const onStart = (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY }
    const onEnd = (e) => {
      const dx = e.changedTouches[0].clientX - startX
      const dy = e.changedTouches[0].clientY - startY
      if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 4) return
      if (selectedRef.current) { if (dx > 0) setSelectedId(null); return }
      const idx = TAB_IDS.indexOf(tabRef.current)
      if (dx < 0) switchTab(TAB_IDS[(idx + 1) % TAB_IDS.length])
      if (dx > 0) switchTab(TAB_IDS[(idx - 1 + TAB_IDS.length) % TAB_IDS.length])
    }
    document.addEventListener('touchstart', onStart, { passive: true, capture: true })
    document.addEventListener('touchend', onEnd, { passive: true, capture: true })
    return () => {
      document.removeEventListener('touchstart', onStart, { capture: true })
      document.removeEventListener('touchend', onEnd, { capture: true })
    }
  }, [switchTab])

  const TABS = [
    { id: 'inventory', label: t.tabs.inventory },
    { id: 'add', label: t.tabs.add },
    { id: 'market', label: t.tabs.market },
    { id: 'report', label: t.tabs.report },
    { id: 'members', label: t.tabs.members },
    { id: 'settings', label: t.tabs.settings },
  ]

  if (selectedId) {
    return <Suspense fallback={null}><ItemDetail id={selectedId} onBack={handleBack} /></Suspense>
  }

  return (
    <>
      <div style={{ paddingBottom: 60 }}>
        <Suspense fallback={null}>
          {visited.has('inventory') && <div style={{ display: tab === 'inventory' ? 'block' : 'none' }}><MemoInventory onSelect={handleSelect} /></div>}
          {visited.has('add')       && <div style={{ display: tab === 'add'       ? 'block' : 'none' }}><MemoAddItem /></div>}
          {visited.has('market')    && <div style={{ display: tab === 'market'    ? 'block' : 'none' }}><MemoMarket /></div>}
          {visited.has('report')    && <div style={{ display: tab === 'report'    ? 'block' : 'none' }}><MemoReport /></div>}
          {visited.has('members')   && <div style={{ display: tab === 'members'   ? 'block' : 'none' }}><MemoMembers /></div>}
          {visited.has('settings')  && <div style={{ display: tab === 'settings'  ? 'block' : 'none' }}><MemoSettings /></div>}
        </Suspense>
      </div>

      <div className="tab-bar">
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => switchTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
    </>
  )
}
