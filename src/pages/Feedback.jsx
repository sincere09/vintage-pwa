import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useT } from '../lib/i18n'

export default function Feedback() {
  const { t } = useT()
  const fp = t.feedbackPage
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!content.trim()) { setError(fp.errorEmpty); return }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.from('feedbacks').insert({ content: content.trim() })
    setLoading(false)
    if (err) { setError(fp.errorFail); return }
    setDone(true)
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7F5F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.04em', color: '#141414', marginBottom: 8 }}>{fp.success}</div>
        <div style={{ fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 1.7 }}>{fp.successSub}</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F5F0', maxWidth: 480, margin: '0 auto', padding: '40px 24px 60px' }}>
      <div style={{ fontSize: 11, letterSpacing: '0.15em', color: '#888', marginBottom: 8, textTransform: 'uppercase' }}>{fp.title}</div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.04em', color: '#141414', marginBottom: 32 }}>{fp.brand}</div>

      <div className="form-group">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={fp.placeholder}
          rows={6}
          style={{ width: '100%', resize: 'none' }}
          autoFocus
        />
      </div>

      {error && <div style={{ color: '#cc0000', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={handleSubmit} disabled={loading}>
        {loading ? fp.submitting : fp.submit}
      </button>
    </div>
  )
}
