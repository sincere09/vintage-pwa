import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Register from './pages/Register.jsx'
import Feedback from './pages/Feedback.jsx'
import MemberLookup from './pages/MemberLookup.jsx'

const THEME_META = {
  taisho: '#F7F5F0', yozakura: '#1A1020',
  ruri: '#EEF1F8', kareno: '#F4EBD5', sumkin: '#111110',
}
const savedTheme = localStorage.getItem('app_theme')
if (savedTheme && savedTheme !== 'taisho') {
  document.documentElement.setAttribute('data-theme', savedTheme)
}
if (savedTheme && THEME_META[savedTheme]) {
  const metaTag = document.querySelector('meta[name="theme-color"]')
  if (metaTag) metaTag.setAttribute('content', THEME_META[savedTheme])
}

const search = window.location.search
const isRegister = search.includes('register')
const isFeedback = search.includes('feedback')
const isLookup = search.includes('lookup')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isRegister ? <Register /> : isFeedback ? <Feedback /> : isLookup ? <MemberLookup /> : <App />}
  </StrictMode>,
)
