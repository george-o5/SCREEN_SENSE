import { useState, useRef, useEffect } from 'react'

export default function App() {
  const [image, setImage] = useState(null)
  const [imageData, setImageData] = useState(null)
  const [sections, setSections] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeButton, setActiveButton] = useState(null)
  const [loadingButton, setLoadingButton] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [largeText, setLargeText] = useState(false)
  const fileInputRef = useRef(null)

  function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setImage(URL.createObjectURL(file))
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
    setSections(null)
    setActiveButton(null)
    setLoadingButton(false)
    window.speechSynthesis.cancel()
  }

  function speakText(text) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.85
    utterance.pitch = 1
    utterance.onend = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  const combinedPrompt = `You are a patient helper for senior citizens.

Look at this screenshot and respond ONLY with valid JSON in this exact format:

{
  "whatItIs": "2-3 simple sentences explaining the screen.",
  "safetyLevel": "SAFE or DANGER",
  "isSafe": "2-3 simple sentences explaining why it is safe or dangerous.",
  "whatToDo": "2-3 numbered steps on what to do next.",
  "confidenceLevel": "HIGH or MEDIUM or LOW"
}

Rules:
- Use VERY simple language
- If there are ANY signs of scam → safetyLevel = "DANGER"
- Otherwise → safetyLevel = "SAFE"
- confidenceLevel: HIGH = clearly safe, MEDIUM = slight uncertainty, LOW = risk or scam detected
- No markdown, no extra text, ONLY JSON
`

  useEffect(() => {
    if (!imageData) return
    analyzeImage()
  }, [imageData])

  async function analyzeImage(buttonKey = 'explain') {
    if (!imageData) return
    setActiveButton(buttonKey)
    setLoadingButton(true)
    setLoading(true)
    setSections(null)

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

      let text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('Empty response')

      let cleaned = text.trim()

      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/```json/g, "")
        cleaned = cleaned.replace(/```/g, "")
      }

      const parsed = JSON.parse(cleaned)
      setSections(parsed)

    } catch (err) {
      console.error(err)
      setSections({
        whatItIs: 'Something went wrong. Please try again.',
        safetyLevel: 'SAFE',
        isSafe: '',
        whatToDo: '',
        confidenceLevel: 'MEDIUM'
      })
    }

    setLoading(false)
    setLoadingButton(false)
  }

  const isWarning = sections?.safetyLevel === "DANGER"

  return (
    <div style={{
      minHeight: '100vh',
      background: '#eef2ff',
      padding: '28px 18px 64px',
      maxWidth: '480px',
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>

      <div style={{ position: 'relative', textAlign: 'center', marginBottom: '36px', paddingTop: '16px' }}>
        <h1 style={{ fontSize: '42px', fontWeight: '900', color: '#1a3fbf', margin: 0 }}>
          ScreenSense
        </h1>
        <p style={{ fontSize: '22px', color: '#374151', margin: '10px 0 0' }}>
          Upload a screenshot, get a simple explanation
        </p>
        <div style={{ position: 'absolute', top: '16px', right: 0, display: 'flex', gap: '6px' }}>
          <button onClick={() => setLargeText(false)} style={{
            fontSize: '15px', fontWeight: '700', padding: '6px 12px',
            background: '#e0e7ff', color: '#1a4fd6', border: 'none',
            borderRadius: '999px', cursor: 'pointer'
          }}>A</button>
          <button onClick={() => setLargeText(true)} style={{
            fontSize: '19px', fontWeight: '700', padding: '6px 12px',
            background: '#e0e7ff', color: '#1a4fd6', border: 'none',
            borderRadius: '999px', cursor: 'pointer'
          }}>A+</button>
        </div>
      </div>

      <button
        onClick={() => fileInputRef.current.click()}
        style={{
          width: '100%',
          background: '#1a3fbf',
          color: 'white',
          fontSize: '24px',
          fontWeight: '800',
          borderRadius: '24px',
          padding: '26px'
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

      {image && (
        <img src={image} style={{ width: '100%', marginTop: '20px', borderRadius: '16px' }} />
      )}

      {loading && (
        <p style={{ textAlign: 'center', marginTop: '30px', fontSize: '22px' }}>
          Analyzing your screen...
        </p>
      )}

      {sections && !loading && (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div style={{ background: 'white', padding: '20px', borderRadius: '16px' }}>
            <b>🔍 What this is</b>
            <p style={{ fontSize: largeText ? '24px' : '21px' }}>{sections.whatItIs}</p>
          </div>

          {isWarning ? (
            <div style={{ background: '#b91c1c', color: 'white', padding: '20px', borderRadius: '16px' }}>
              <b>🚨 DANGER — POSSIBLE SCAM</b>
              <p>This might be a scam. Do NOT click anything.</p>
              <p style={{ fontSize: largeText ? '24px' : '21px' }}>{sections.isSafe}</p>
              <p style={{ fontSize: '18px', fontWeight: '800', color: '#fef2f2', margin: '10px 0 4px' }}>
                🛑 Stop and do not interact with this.
              </p>
              <p style={{ fontSize: '16px', fontWeight: '700', color: '#fca5a5', margin: '8px 0 0' }}>
                🔴 Low confidence
              </p>
            </div>
          ) : (
            <div style={{ background: '#dcfce7', padding: '20px', borderRadius: '16px' }}>
              <b>🛡️ This looks safe</b>
              <p style={{ fontSize: largeText ? '24px' : '21px' }}>{sections.isSafe}</p>
              <p style={{ fontSize: '18px', fontWeight: '800', color: '#14532d', margin: '10px 0 4px' }}>
                {sections.confidenceLevel === 'MEDIUM'
                  ? '⚠️ Be careful and double-check.'
                  : '✅ You are safe to continue.'}
              </p>
              <p style={{
                fontSize: '16px', fontWeight: '700', margin: '8px 0 0',
                color: sections.confidenceLevel === 'HIGH' ? '#15803d'
                     : sections.confidenceLevel === 'LOW'  ? '#b91c1c'
                     : '#92400e'
              }}>
                {sections.confidenceLevel === 'HIGH' ? '🟢 High confidence'
                 : sections.confidenceLevel === 'LOW' ? '🔴 Low confidence'
                 : '🟡 Be careful'}
              </p>
            </div>
          )}

          <div style={{ background: '#faf5ff', padding: '20px', borderRadius: '16px' }}>
            <b>👉 What to do next</b>
            <p style={{ fontSize: largeText ? '24px' : '21px' }}>{sections.whatToDo}</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button
                onClick={() => speakText(`${sections.whatItIs} ${sections.isSafe} ${sections.whatToDo}`)}
                style={{
                  flex: 1, fontSize: '22px', fontWeight: '700', padding: '20px',
                  background: '#fef9c3', color: '#713f12', border: 'none', borderRadius: '14px', cursor: 'pointer'
                }}
              >
                🔊 Read Aloud
              </button>
              {speaking && (
                <button
                  onClick={() => { window.speechSynthesis.cancel(); setSpeaking(false) }}
                  style={{
                    flex: 1, fontSize: '22px', fontWeight: '700', padding: '20px',
                    background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '14px', cursor: 'pointer'
                  }}
                >
                  ⏹ Stop
                </button>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}