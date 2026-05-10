import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Register from './pages/Register.jsx'
import Feedback from './pages/Feedback.jsx'
import MemberLookup from './pages/MemberLookup.jsx'

const search = window.location.search
const isRegister = search.includes('register')
const isFeedback = search.includes('feedback')
const isLookup = search.includes('lookup')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isRegister ? <Register /> : isFeedback ? <Feedback /> : isLookup ? <MemberLookup /> : <App />}
  </StrictMode>,
)
