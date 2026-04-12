import { useState, useRef } from 'react'

export default function App() {
  const [image, setImage] = useState(null)
  const [imageData, setImageData] = useState(null)
  const [explanation, setExplanation] = useState('')
  const [loading, setLoading] = useState(false)
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

  async function analyzeImage(promptText) {
    if (!imageData) return
    setLoading(true)
    setExplanation('')

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: imageData
                  }
                },
                { text: promptText }
              ]
            }]
          })
        }
      )

      const data = await response.json()
      const text = data.candidates[0].content.parts[0].text
      setExplanation(text)
    } catch (err) {
      setExplanation('Something went wrong. Please try again.')
      console.error(err)
    }

    setLoading(false)
  }

  const prompts = {
    explain: `You are a patient helper for senior citizens who struggle with smartphones.
Look at this screenshot and explain in simple friendly language:
1. What screen or app is this?
2. What is the most important thing shown?
3. What can the person do here?
Use short sentences. No technical jargon. Maximum 4 sentences.`,

    safe: `Look at this screenshot. Is there anything suspicious, dangerous, or scam-like?
Explain in very simple language whether this looks safe or not, and why.
Be direct and calm. Maximum 3 sentences.`,

    next: `Look at this screenshot. What should a senior citizen do next on this screen?
Give 2-3 simple numbered steps. Use plain language a grandparent would understand.`
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-lg mx-auto">

      <h1 className="text-3xl font-bold text-center text-blue-700 mt-6 mb-2">
        ScreenSense
      </h1>
      <p className="text-center text-gray-500 text-lg mb-8">
        Take a screenshot, get a simple explanation
      </p>

      <button
        onClick={() => fileInputRef.current.click()}
        className="w-full bg-blue-600 text-white text-xl font-semibold py-5 rounded-2xl mb-4"
      >
        📷 Upload Screenshot
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {image && (
        <div className="mb-4">
          <img
            src={image}
            alt="Uploaded screenshot"
            className="w-full rounded-2xl border border-gray-200 shadow"
          />
        </div>
      )}

      {imageData && (
        <div className="flex flex-col gap-3 mb-6">
          <button
            onClick={() => analyzeImage(prompts.explain)}
            className="w-full bg-white border-2 border-blue-400 text-blue-700 text-xl font-semibold py-4 rounded-2xl"
          >
            🔍 Explain this screen
          </button>
          <button
            onClick={() => analyzeImage(prompts.safe)}
            className="w-full bg-white border-2 border-green-400 text-green-700 text-xl font-semibold py-4 rounded-2xl"
          >
            🛡️ Is this safe?
          </button>
          <button
            onClick={() => analyzeImage(prompts.next)}
            className="w-full bg-white border-2 border-purple-400 text-purple-700 text-xl font-semibold py-4 rounded-2xl"
          >
            👉 What should I do next?
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center text-gray-500 text-xl py-8">
          Thinking... 🤔
        </div>
      )}

      {explanation && !loading && (
        <div className="bg-white rounded-2xl p-5 shadow border border-gray-100">
          <p className="text-2xl leading-relaxed text-gray-800">
            {explanation}
          </p>
        </div>
      )}

    </div>
  )
}