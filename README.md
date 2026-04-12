# ScreenSense 📱
### AI-Powered Screen Explainer for Senior Citizens

> Built for **GenLink Hacks** — a hackathon dedicated to reducing the digital divide for senior citizens.

---

## 🧠 The Problem

Senior citizens are increasingly expected to use smartphones for everything — banking, healthcare, communication, and more. But the interfaces are confusing, the language is technical, and one wrong tap can feel catastrophic.

There's no one to ask. There's no simple guide. And the fear of making mistakes keeps millions of seniors from independently using the technology they need.

---

## 💡 The Solution

**ScreenSense** lets any senior citizen take a screenshot of anything confusing on their phone and instantly get a simple, plain-English explanation — powered by AI.

No typing. No searching. No confusion. Just: *take screenshot → get explanation.*

---

## ✨ Features

### 🔍 Explain This Screen
Upload any screenshot and get a clear, senior-friendly breakdown:
- What app or screen is this?
- What's the most important thing on it?
- What can the person do here?

### 🛡️ Is This Safe?
Detects potentially suspicious screens, scam messages, phishing links, and fraud attempts — explained in calm, simple language.

### 👉 What Should I Do Next?
Step-by-step guidance written like a patient family member is explaining it — not a tech manual.

### 🔊 Read Aloud *(coming soon)*
Text-to-speech reads the explanation out loud, removing the need to read at all.

---

## 🎯 Why This Matters for GenLink's Mission

GenLink's goal is to help senior citizens feel confident using technology and detect scams. ScreenSense directly addresses both:

- **Confidence** — seniors no longer have to guess what a screen means
- **Scam detection** — AI flags suspicious content before they act on it
- **Independence** — no need to call a family member for every confusing notification
- **Accessibility** — large text, simple buttons, voice output (no typing required)

This isn't just a hackathon project. It's a tool that could realistically be used at GenLink's senior centers — today.

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React + Vite | Fast, modern, runs in any browser |
| Styling | Tailwind CSS | Clean, responsive, senior-friendly large UI |
| AI | Google Gemini 2.5 Flash API | Free tier, vision model, accurate image understanding |
| Deployment | Vercel | Free hosting, instant deploy, works on any device |

**No backend required.** The app runs entirely in the browser — making it lightweight, fast, and easy to deploy anywhere.

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js (v18+)
- A free Google Gemini API key from [aistudio.google.com](https://aistudio.google.com)

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/screensense.git
cd screensense

# Install dependencies
npm install

# Create environment file
echo "VITE_GEMINI_KEY=your_api_key_here" > .env

# Start development server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 📱 How to Use

1. Open ScreenSense on your phone or computer
2. Take a screenshot of any confusing screen
3. Tap **Upload Screenshot** and select it
4. Tap one of the three buttons:
   - 🔍 **Explain this screen** — get a plain-English breakdown
   - 🛡️ **Is this safe?** — check for scams or suspicious content
   - 👉 **What should I do next?** — get simple step-by-step guidance
5. Read (or listen to) the explanation

---

## 🧓 Designed for Seniors

Every design decision was made with seniors in mind:

- **Extra large buttons** — easy to tap, hard to miss
- **Large readable text** — no squinting required
- **Simple 3-button interface** — no menus, no navigation, no confusion
- **Plain English output** — AI is instructed to avoid all technical jargon
- **No account needed** — open and use immediately

---

## 📁 Project Structure

```
screensense/
├── src/
│   ├── App.jsx        ← entire application logic and UI
│   └── index.css      ← Tailwind import
├── index.html         ← HTML shell
├── vite.config.js     ← Vite + Tailwind config
└── .env               ← API key (not committed to GitHub)
```

---

## 🔮 Future Plans

- **Voice output** — text-to-speech reads explanations aloud
- **Camera integration** — take photo directly in app, no screenshot needed
- **Offline mode** — cached explanations for common screens
- **Multiple languages** — support for non-English speaking seniors
- **Browser extension** — explain any webpage with one click

---

## 👨‍💻 Built By



> *"My goal was to build something that could genuinely help someone's grandparent feel less lost and more confident with their phone."*

---

## 📄 License

MIT License — free to use, modify, and deploy.

---

*Built with ❤️ for GenLink Hacks 2026 — dedicated to reducing the digital divide for senior citizens.*