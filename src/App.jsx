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
    // If this card is already speaking, STOP and return early
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
    
    const utterance = new SpeechSynthesisUtterance(cards[key].result)
    
    // Pick the best available voice
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      
      // Priority 1: Microsoft Jenny Online (Natural)
      const jenny = voices.find(v => v.name.includes('Jenny'))
      if (jenny) return jenny
      
      // Priority 2: Microsoft Aria
      const aria = voices.find(v => v.name.includes('Aria'))
      if (aria) return aria
      
      // Priority 3: Any female English voice
      const femaleVoice = voices.find(v => 
        v.lang.startsWith('en') && 
        (v.name.includes('Female') || v.name.includes('female') || 
         v.name.includes('Samantha') || v.name.includes('Karen') ||
         v.name.includes('Google UK English Female'))
      )
      if (femaleVoice) return femaleVoice
      
      // Fallback: Any English voice
      return voices.find(v => v.lang.startsWith('en')) || voices[0]
    }
    
    const assignVoice = () => {
      const voice = pickVoice()
      if (voice) utterance.voice = voice
      
      utterance.rate = 0.85
      utterance.pitch = 1
      utterance.volume = 1
      utterance.onend = () => setCards(prev => ({ ...prev, [key]: { ...prev[key], speaking: false } }))
      utterance.onerror = () => setCards(prev => ({ ...prev, [key]: { ...prev[key], speaking: false } }))
      
      setCards(prev => ({ ...prev, [key]: { ...prev[key], speaking: true } }))
      window.speechSynthesis.speak(utterance)
    }
    
    // Voices may not be loaded yet on first call
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = assignVoice
    } else {
      assignVoice()
    }
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
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_KEY}`,
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
    <>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .result-appear {
          animation: fadeSlideIn 0.3s ease forwards;
        }
        .card-btn:hover { filter: brightness(0.97); }
        .card-btn:active { transform: scale(0.99); }
        .upload-btn:active { transform: scale(0.98); }
      `}</style>
      <div style={{
        minHeight: '100vh',
        background: '#f5f6fa',
        padding: '0 0 60px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>

      {/* Top bar */}
      <div style={{
        width: '100%',
        background: '#ffffff',
        borderBottom: '2px solid #e0e7ff',
        padding: '16px 20px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)'
      }}>
        <div style={{ fontSize: '28px', fontWeight: '900', color: '#2d3a8c', letterSpacing: '-0.5px' }}>
          ScreenSense
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setLargeText(false)}
            style={{
              fontSize: '14px',
              fontWeight: '700',
              padding: '6px 14px',
              background: largeText ? '#eef2ff' : '#2d3a8c',
              color: largeText ? '#2d3a8c' : 'white',
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
              fontSize: '14px',
              fontWeight: '700',
              padding: '6px 14px',
              background: largeText ? '#2d3a8c' : '#eef2ff',
              color: largeText ? 'white' : '#2d3a8c',
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
        className="upload-btn"
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, #2d3a8c 0%, #4f63d2 100%)',
          color: 'white',
          fontSize: '21px',
          fontWeight: '800',
          borderRadius: '18px',
          padding: '22px 28px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          border: 'none',
          boxSizing: 'border-box',
          boxShadow: '0 4px 18px rgba(45,58,140,0.25)',
          transition: 'transform 0.1s, box-shadow 0.1s'
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
          <h2 style={{ fontSize: '27px', fontWeight: '900', color: '#2d3a8c', margin: '16px 0 10px', lineHeight: '1.3' }}>
            Confused by something on your phone?
          </h2>
          <p style={{ fontSize: '17px', color: '#6b7280', lineHeight: '1.6', maxWidth: '360px', margin: '0 auto', marginTop: '6px' }}>
            Upload your screen and we'll explain it in plain simple words.
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '20px' }}>
            <span style={{ fontSize: '15px', padding: '8px 16px', borderRadius: '20px', fontWeight: '700', background: '#f0f4ff', color: '#1e40af' }}>🔍 Explain it</span>
            <span style={{ fontSize: '15px', padding: '8px 16px', borderRadius: '20px', fontWeight: '700', background: '#f0fdf4', color: '#166534' }}>🛡️ Check safety</span>
            <span style={{ fontSize: '15px', padding: '8px 16px', borderRadius: '20px', fontWeight: '700', background: '#f5f3ff', color: '#5b21b6' }}>👉 What to do next</span>
          </div>
        </div>
      )}

      {image && (
        <>
          <div style={{
            borderRadius: '20px',
            overflow: 'hidden',
            border: '2px solid #e0e4f4',
            boxShadow: '0 4px 24px rgba(45,58,140,0.10)',
            margin: '0 0 4px'
          }}>
            <img src={image} style={{ width: '100%', display: 'block' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', margin: '12px 0' }}>
            <button
              onClick={() => fileInputRef.current.click()}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #2d3a8c 0%, #4f63d2 100%)',
                color: 'white',
                fontSize: '16px',
                fontWeight: '700',
                border: 'none',
                borderRadius: '14px',
                padding: '14px',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(45,58,140,0.18)'
              }}
            >
              📷 Upload New
            </button>
            <button
              onClick={reset}
              style={{
                flex: 1,
                background: '#f3f4f6',
                color: '#374151',
                fontSize: '16px',
                fontWeight: '700',
                border: '2px solid #e5e7eb',
                borderRadius: '14px',
                padding: '14px',
                cursor: 'pointer'
              }}
            >
              ↩ Start Over
            </button>
          </div>
        </>
      )}

      {imageData && (() => {
        const cardConfigs = [
          { key: 'explain', emoji: '🔍', title: 'Explain this screen', subtitle: 'What am I looking at?', cardBg: '#f0f4ff', cardColor: '#a5b4fc', cardTextColor: '#1e40af', cardSubColor: '#3b82f6' },
          { key: 'safe',    emoji: '🛡️', title: 'Is this safe?',        subtitle: 'Check for scams or dangers', cardBg: '#f0fdf4', cardColor: '#6ee7b7', cardTextColor: '#166534', cardSubColor: '#16a34a' },
          { key: 'next',    emoji: '👉', title: 'What should I do next?', subtitle: 'Step-by-step guide',        cardBg: '#f5f3ff', cardColor: '#c4b5fd', cardTextColor: '#5b21b6', cardSubColor: '#7c3aed' },
        ]
        const anyCardLoading = cards.explain.loading || cards.safe.loading || cards.next.loading
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px' }}>
            {cardConfigs.map(({ key, emoji, title, subtitle, cardBg, cardColor, cardTextColor, cardSubColor }) => {
              const thisCardLoading = cards[key].loading
              return (
                <div key={key} style={{
                  background: 'white',
                  borderRadius: '24px',
                  border: `2px solid ${cardColor}`,
                  overflow: 'hidden',
                  opacity: (anyCardLoading && !thisCardLoading) ? 0.45 : 1,
                  transition: 'opacity 0.2s, box-shadow 0.2s',
                  boxShadow: '0 2px 16px rgba(45,58,140,0.08)'
                }}>
                  {/* Card Header — static display only */}
                  <div className="card-btn" style={{
                    width: '100%', background: cardBg, border: 'none',
                    padding: '18px 20px', display: 'flex', alignItems: 'center',
                    gap: '14px',
                    borderRadius: cards[key].result ? '22px 22px 0 0' : '22px',
                    transition: 'background 0.15s'
                  }}>
                    <span style={{ fontSize: '28px' }}>{emoji}</span>
                    <span style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                      <span style={{ fontSize: '21px', fontWeight: '800', color: cardTextColor, letterSpacing: '-0.2px' }}>{title}</span>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: cardSubColor, marginTop: '2px' }}>{subtitle}</span>
                    </span>
                    {thisCardLoading && <span style={{ marginLeft: 'auto', fontSize: '20px' }}>⏳</span>}
                    {cards[key].result && !thisCardLoading && <span style={{ marginLeft: 'auto', fontSize: '16px', color: cardTextColor }}>✓</span>}
                  </div>

                  {/* Result area — only visible when result exists */}
                  {cards[key].result && !cards[key].loading && (
                    <div style={{ padding: '0 20px 20px' }}>
                      <div className="result-appear" style={{ borderTop: `1.5px solid ${cardColor}`, paddingTop: '18px' }}>
                        {/* Safety banner for safe card */}
                        {key === 'safe' && (() => {
                          const resultLower = cards.safe.result.toLowerCase()
                          const isDanger = resultLower.includes('scam') || resultLower.includes('suspicious') || resultLower.includes('dangerous') || resultLower.includes('unsafe')
                          if (isDanger) {
                            return (
                              <div style={{
                                background: '#fef2f2',
                                border: '2px solid #fca5a5',
                                borderRadius: '14px',
                                padding: '14px 18px',
                                marginBottom: '14px'
                              }}>
                                <div style={{ fontSize: '18px', fontWeight: '800', color: '#991b1b' }}>
                                  ⚠️ This may not be safe
                                </div>
                              </div>
                            )
                          } else {
                            return (
                              <div style={{
                                background: '#f0fdf4',
                                border: '2px solid #6ee7b7',
                                borderRadius: '14px',
                                padding: '14px 18px',
                                marginBottom: '14px'
                              }}>
                                <div style={{ fontSize: '18px', fontWeight: '800', color: '#065f46' }}>
                                  ✅ This looks safe
                                </div>
                              </div>
                            )
                          }
                        })()}
                        <p style={{ fontSize: largeText ? '23px' : '20px', lineHeight: '1.7', color: '#1a1a2e', fontWeight: '400', margin: '0 0 14px', marginTop: '2px', whiteSpace: 'pre-line' }}>
                          {cards[key].result}
                        </p>
                        {/* Read Aloud toggle */}
                        <button
                          onClick={() => speakCard(key)}
                          style={{
                            width: '100%',
                            padding: '14px',
                            background: cards[key].speaking ? '#fef2f2' : '#fffbeb',
                            color: cards[key].speaking ? '#991b1b' : '#92400e',
                            border: cards[key].speaking ? '1.5px solid #fca5a5' : '1.5px solid #fde68a',
                            borderRadius: '14px',
                            fontSize: '17px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
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
    </>
  )
}