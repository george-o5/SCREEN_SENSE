import { useState, useRef, useEffect } from 'react'

export default function App() {
  const [image, setImage] = useState(null)
  const [imageData, setImageData] = useState(null)
  const [cards, setCards] = useState({
    explain: { result: '', loading: false, speaking: false },
    safe:    { result: '', loading: false, speaking: false },
    next:    { result: '', loading: false, speaking: false }
  })
  const [largeText, setLargeText] = useState(false)
  const fileInputRef = useRef(null)

  function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setImage(URL.createObjectURL(file))
    setCards({
      explain: { result: '', loading: false, speaking: false },
      safe:    { result: '', loading: false, speaking: false },
      next:    { result: '', loading: false, speaking: false }
    })
    window.speechSynthesis.cancel()
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      setImageData(base64)
    }
    reader.readAsDataURL(file)
  }

  function reset() {
    setImage(null)
    setImageData(null)
    setCards({
      explain: { result: '', loading: false, speaking: false },
      safe:    { result: '', loading: false, speaking: false },
      next:    { result: '', loading: false, speaking: false }
    })
    window.speechSynthesis.cancel()
  }

  function speakCard(key) {
    // If this card is already speaking, stop it
    if (cards[key].speaking) {
      window.speechSynthesis.cancel()
      setCards(prev => ({ ...prev, [key]: { ...prev[key], speaking: false } }))
      return
    }
    
    // Stop any other card that might be speaking
    window.speechSynthesis.cancel()
    setCards(prev => ({
      ...prev,
      explain: { ...prev.explain, speaking: false },
      safe:    { ...prev.safe,    speaking: false },
      next:    { ...prev.next,    speaking: false }
    }))
    
    const text = cards[key].result
    if (!text) return
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.85
    utterance.pitch = 1
    utterance.onend = () => setCards(prev => ({ ...prev, [key]: { ...prev[key], speaking: false } }))
    utterance.onerror = () => setCards(prev => ({ ...prev, [key]: { ...prev[key], speaking: false } }))
    
    setCards(prev => ({ ...prev, [key]: { ...prev[key], speaking: true } }))
    window.speechSynthesis.speak(utterance)
  }

  const combinedPrompt = `You are a patient helper for senior citizens who struggle with smartphones.

Look at this screenshot and respond with exactly 3 sections separated by "---":

SECTION 1 - EXPLANATION:
Explain in simple friendly language:
1. What screen or app is this?
2. What is the most important thing shown?
3. What can the person do here?
Use short sentences. No technical jargon. Maximum 4 sentences.

---

SECTION 2 - SAFETY:
Is there anything suspicious, dangerous, or scam-like?
Explain in very simple language whether this looks safe or not, and why.
Be direct and calm. Maximum 3 sentences.

---

SECTION 3 - NEXT STEPS:
What should a senior citizen do next on this screen?
Give 2-3 simple numbered steps. Use plain language a grandparent would understand.`

  useEffect(() => {
    if (!imageData) return
    
    const fetchAll = async () => {
      setCards(prev => ({
        explain: { ...prev.explain, loading: true },
        safe: { ...prev.safe, loading: true },
        next: { ...prev.next, loading: true }
      }))

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${import.meta.env.VITE_GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { inline_data: { mime_type: 'image/jpeg', data: imageData } },
                  { text: combinedPrompt }
                ]
              }]
            })
          }
        )

        const data = await response.json()

        if (!response.ok || data.error) {
          throw new Error(data.error?.message || `Error ${response.status}`)
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text) throw new Error('Empty response')

        // Split response into 3 sections
        const sections = text.split('---').map(s => s.trim())
        const explanation = sections[0]?.replace(/SECTION 1.*?:\s*/i, '') || 'Could not explain this screen.'
        const safety = sections[1]?.replace(/SECTION 2.*?:\s*/i, '') || 'Could not determine safety.'
        const nextSteps = sections[2]?.replace(/SECTION 3.*?:\s*/i, '') || 'No steps available.'

        setCards({
          explain: { result: explanation, loading: false, speaking: false },
          safe: { result: safety, loading: false, speaking: false },
          next: { result: nextSteps, loading: false, speaking: false }
        })

      } catch (err) {
        console.error(err)
        const errorMsg = err.message.includes('quota') || err.message.includes('429')
          ? 'Rate limit reached. Please wait 30 seconds and try again.'
          : 'Something went wrong. Please try again.'
        
        setCards({
          explain: { result: errorMsg, loading: false, speaking: false },
          safe: { result: errorMsg, loading: false, speaking: false },
          next: { result: errorMsg, loading: false, speaking: false }
        })
      }
    }
    
    fetchAll()
  }, [imageData])

  async function analyzeCard(key, promptText) {
    if (!imageData) return
    setCards(prev => ({ ...prev, [key]: { ...prev[key], loading: true, result: '' } }))

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${import.meta.env.VITE_GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: 'image/jpeg', data: imageData } },
                { text: promptText }
              ]
            }]
          })
        }
      )

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error?.message || `Error ${response.status}`)
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('Empty response')

      setCards(prev => ({ ...prev, [key]: { ...prev[key], loading: false, result: text.trim() } }))

    } catch (err) {
      console.error(err)
      setCards(prev => ({ ...prev, [key]: { ...prev[key], loading: false, result: 'Something went wrong. Please try again.' } }))
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#eef2ff',
      padding: '0 0 60px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>

      {/* Top bar */}
      <div style={{
        width: '100%',
        background: 'white',
        borderBottom: '2px solid #e0e7ff',
        padding: '16px 20px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}>
        <div style={{ fontSize: '26px', fontWeight: '800', color: '#1a4fd6' }}>
          ScreenSense
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setLargeText(false)}
            style={{
              fontSize: '15px',
              fontWeight: '700',
              padding: '6px 14px',
              background: largeText ? '#e0e7ff' : '#1a4fd6',
              color: largeText ? '#1a4fd6' : 'white',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer'
            }}
          >
            A
          </button>
          <button
            onClick={() => setLargeText(true)}
            style={{
              fontSize: '15px',
              fontWeight: '700',
              padding: '6px 14px',
              background: largeText ? '#1a4fd6' : '#e0e7ff',
              color: largeText ? 'white' : '#1a4fd6',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer'
            }}
          >
            A+
          </button>
        </div>
      </div>

      {/* Content area */}
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 16px' }}>

      <button
        onClick={() => fileInputRef.current.click()}
        style={{
          width: '100%',
          background: '#1a4fd6',
          borderLeft: '5px solid #3b82f6',
          color: 'white',
          fontSize: '20px',
          fontWeight: '800',
          borderRadius: '16px',
          padding: '20px 24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          border: 'none',
          boxSizing: 'border-box'
        }}
      >
        📷 Upload Screenshot
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />

      {!image && (
        <div style={{ textAlign: 'center', paddingTop: '32px' }}>
          <div style={{ fontSize: '48px', letterSpacing: '8px', marginBottom: '16px' }}>📱 ➡️ 💬</div>
          <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#1a4fd6', margin: '16px 0 10px', lineHeight: '1.3' }}>
            Confused by something on your phone?
          </h2>
          <p style={{ fontSize: '18px', color: '#6b7280', lineHeight: '1.6', maxWidth: '360px', margin: '0 auto' }}>
            Upload your screen and we'll explain it in plain simple words.
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '20px' }}>
            <span style={{ fontSize: '15px', padding: '8px 16px', borderRadius: '20px', fontWeight: '700', background: '#dbeafe', color: '#1e40af' }}>🔍 Explain it</span>
            <span style={{ fontSize: '15px', padding: '8px 16px', borderRadius: '20px', fontWeight: '700', background: '#dcfce7', color: '#166534' }}>🛡️ Check safety</span>
            <span style={{ fontSize: '15px', padding: '8px 16px', borderRadius: '20px', fontWeight: '700', background: '#ede9fe', color: '#5b21b6' }}>👉 What to do next</span>
          </div>
        </div>
      )}

      {image && (
        <>
          <div style={{
            borderRadius: '16px',
            overflow: 'hidden',
            border: '3px solid #c7d7fc',
            boxShadow: '0 4px 20px rgba(99,102,241,0.12)',
            margin: '0 0 4px'
          }}>
            <img src={image} style={{ width: '100%', display: 'block' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', margin: '12px 0' }}>
            <button
              onClick={() => fileInputRef.current.click()}
              style={{
                flex: 1, background: '#1a4fd6', color: 'white',
                fontSize: '16px', fontWeight: '700',
                border: 'none', borderRadius: '14px',
                padding: '14px', cursor: 'pointer'
              }}
            >
              📷 Upload New
            </button>
            <button
              onClick={reset}
              style={{
                flex: 1, background: '#f3f4f6', color: '#374151',
                fontSize: '16px', fontWeight: '700',
                border: '2px solid #e5e7eb', borderRadius: '14px',
                padding: '14px', cursor: 'pointer'
              }}
            >
              ↩ Start Over
            </button>
          </div>
        </>
      )}

      {imageData && (() => {
        const cardConfigs = [
          { key: 'explain', emoji: '🔍', title: 'Explain this screen', subtitle: 'What am I looking at?', cardBg: '#dbeafe', cardColor: '#93c5fd', cardTextColor: '#1e40af', cardSubColor: '#3b82f6' },
          { key: 'safe',    emoji: '🛡️', title: 'Is this safe?',        subtitle: 'Check for scams or dangers', cardBg: '#dcfce7', cardColor: '#86efac', cardTextColor: '#166534', cardSubColor: '#16a34a' },
          { key: 'next',    emoji: '👉', title: 'What should I do next?', subtitle: 'Step-by-step guide',        cardBg: '#ede9fe', cardColor: '#c4b5fd', cardTextColor: '#5b21b6', cardSubColor: '#7c3aed' },
        ]
        const anyCardLoading = cards.explain.loading || cards.safe.loading || cards.next.loading
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px' }}>
            {cardConfigs.map(({ key, emoji, title, subtitle, cardBg, cardColor, cardTextColor, cardSubColor }) => {
              const thisCardLoading = cards[key].loading
              return (
                <div key={key} style={{
                  background: 'white',
                  borderRadius: '20px',
                  border: `2px solid ${cardColor}`,
                  overflow: 'hidden',
                  opacity: (anyCardLoading && !thisCardLoading) ? 0.45 : 1,
                  transition: 'opacity 0.2s'
                }}>
                  {/* Card Header — static display only */}
                  <div style={{
                    width: '100%', background: cardBg, border: 'none',
                    padding: '18px 20px', display: 'flex', alignItems: 'center',
                    gap: '14px'
                  }}>
                    <span style={{ fontSize: '28px' }}>{emoji}</span>
                    <span style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                      <span style={{ fontSize: '20px', fontWeight: '700', color: cardTextColor }}>{title}</span>
                      <span style={{ fontSize: '13px', color: cardSubColor, marginTop: '2px' }}>{subtitle}</span>
                    </span>
                    {thisCardLoading && <span style={{ marginLeft: 'auto', fontSize: '20px' }}>⏳</span>}
                    {cards[key].result && !thisCardLoading && <span style={{ marginLeft: 'auto', fontSize: '16px', color: cardTextColor }}>✓</span>}
                  </div>

                  {/* Result area — only visible when result exists */}
                  {cards[key].result && !cards[key].loading && (
                    <div style={{ padding: '0 20px 20px' }}>
                      <div style={{ borderTop: `1.5px solid ${cardColor}`, paddingTop: '16px' }}>
                        {/* Safety banner for safe card */}
                        {key === 'safe' && (() => {
                          const resultLower = cards.safe.result.toLowerCase()
                          const isDanger = resultLower.includes('scam') || resultLower.includes('suspicious') || resultLower.includes('dangerous') || resultLower.includes('unsafe')
                          if (isDanger) {
                            return (
                              <div style={{
                                background: '#fef2f2',
                                border: '2px solid #fca5a5',
                                borderRadius: '12px',
                                padding: '12px 16px',
                                marginBottom: '12px'
                              }}>
                                <div style={{ fontSize: '17px', fontWeight: '800', color: '#991b1b' }}>
                                  ⚠️ This may not be safe
                                </div>
                              </div>
                            )
                          } else {
                            return (
                              <div style={{
                                background: '#f0fdf4',
                                border: '2px solid #86efac',
                                borderRadius: '12px',
                                padding: '12px 16px',
                                marginBottom: '12px'
                              }}>
                                <div style={{ fontSize: '17px', fontWeight: '800', color: '#166534' }}>
                                  ✅ This looks safe
                                </div>
                              </div>
                            )
                          }
                        })()}
                        <p style={{ fontSize: largeText ? '22px' : '19px', lineHeight: '1.65', color: '#111827', margin: '0 0 14px', whiteSpace: 'pre-line' }}>
                          {cards[key].result}
                        </p>
                        {/* Read Aloud toggle */}
                        <button
                          onClick={() => speakCard(key)}
                          style={{
                            width: '100%', padding: '14px',
                            background: cards[key].speaking ? '#fee2e2' : '#fef9c3',
                            color: cards[key].speaking ? '#991b1b' : '#854d0e',
                            border: 'none', borderRadius: '12px',
                            fontSize: '17px', fontWeight: '700', cursor: 'pointer'
                          }}
                        >
                          {cards[key].speaking ? '⏹ Stop Reading' : '🔊 Read Aloud'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}
      </div>
    </div>
  )
}