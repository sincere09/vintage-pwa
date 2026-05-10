import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Register() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', gender: '', region: '', preferred_size: '', occupation: '', age_group: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('請填寫姓名'); return }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.from('customers').insert({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      gender: form.gender,
      region: form.region,
      preferred_size: form.preferred_size,
      occupation: form.occupation,
      age_group: form.age_group,
    })
    setLoading(false)
    if (err) { setError('送出失敗，請稍後再試'); return }
    setDone(true)
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7F5F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.04em', color: '#141414', marginBottom: 8 }}>登記成功</div>
        <div style={{ fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 1.7 }}>
          感謝您成為 JIKOMAN 的會員<br />期待與您的下次相遇
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F5F0', maxWidth: 480, margin: '0 auto', padding: '40px 24px 60px' }}>
      <div style={{ fontSize: 11, letterSpacing: '0.15em', color: '#888', marginBottom: 8, textTransform: 'uppercase' }}>Member Registration</div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.04em', color: '#141414', marginBottom: 32 }}>JIKOMAN.</div>

      <div className="form-group">
        <label>暱稱 Nickname ニックネーム *</label>
        <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="王小明 / Mika / みか" autoFocus />
      </div>
      <div className="form-group">
        <label>電話</label>
        <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0912-345-678" />
      </div>
      <div className="form-group">
        <label>Email</label>
        <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" />
      </div>
      <div className="form-group">
        <label>性別</label>
        <select value={form.gender} onChange={e => set('gender', e.target.value)}>
          <option value="">— 不填 —</option>
          <option value="男">男</option>
          <option value="女">女</option>
          <option value="其他">其他</option>
        </select>
      </div>
      <div className="form-group">
        <label>常穿尺寸</label>
        <select value={form.preferred_size} onChange={e => set('preferred_size', e.target.value)}>
          <option value="">— 不填 —</option>
          {['XXS','XS','S','M','L','XL','XXL','3XL'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>地區</label>
        <select value={form.region} onChange={e => set('region', e.target.value)}>
          <option value="">— 不填 —</option>
          {['台北市','新北市','桃園市','台中市','台南市','高雄市','基隆市','新竹市','嘉義市','新竹縣','苗栗縣','彰化縣','南投縣','雲林縣','嘉義縣','屏東縣','宜蘭縣','花蓮縣','台東縣','澎湖縣','金門縣','連江縣','海外'].map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>職業 Occupation 職業</label>
        <select value={form.occupation} onChange={e => set('occupation', e.target.value)}>
          <option value="">— 不填 / Skip / 未入力 —</option>
          <option value="學生">學生 Student 学生</option>
          <option value="上班族">上班族 Office Worker 会社員</option>
          <option value="自由業">自由業 Freelance フリーランス</option>
          <option value="設計師／創作者">設計師／創作者 Designer / Creator デザイナー</option>
          <option value="服務業">服務業 Service サービス業</option>
          <option value="老師">老師 Teacher 教師</option>
          <option value="醫療">醫療 Healthcare 医療</option>
          <option value="其他">其他 Other その他</option>
        </select>
      </div>

      <div className="form-group">
        <label>年齡層 Age Group 年齢層</label>
        <select value={form.age_group} onChange={e => set('age_group', e.target.value)}>
          <option value="">— 不填 / Skip / 未入力 —</option>
          <option value="18歲以下">18歲以下 / Under 18 / 18歳未満</option>
          <option value="18–24">18–24</option>
          <option value="25–34">25–34</option>
          <option value="35–44">35–44</option>
          <option value="45歲以上">45歲以上 / 45+ / 45歳以上</option>
        </select>
      </div>

      {error && <div style={{ color: '#cc0000', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={handleSubmit} disabled={loading}>
        {loading ? '送出中...' : '加入會員'}
      </button>
    </div>
  )
}
