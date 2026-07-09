# 🇮🇳 BharatLive - The Future of Indian News

<div align="center">
  <p><b>A modern, real-time Indian news application featuring an interactive 3D globe and AI-powered credibility checks.</b></p>
</div>

## ✨ Features
* **🌍 Interactive 3D Globe:** Spin and explore news articles geographically across India.
* **⚡ Blazing Fast:** Server-side rendered with TanStack Start and Vite for instant load times.
* **🤖 AI Credibility Check:** Instant AI-powered clickbait detection and fact-checking.
* **💬 BharatBot AI Assistant:** A dedicated Chatbot that answers questions about current events.
* **🔐 Secure Authentication:** Seamless user login and Row-Level Security powered by Supabase.
* **📱 Mobile-First Design:** A stunning glassmorphism UI built with Tailwind CSS that feels like a native app.

## 🛠️ Tech Stack
* **Frontend:** React, TanStack Start, Tailwind CSS, Radix UI, Three.js (React Three Fiber)
* **Backend:** Supabase (PostgreSQL, Auth), Nitro Server Functions
* **APIs:** NewsData API, OpenRouter (GPT-4o)

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/your-username/bharat-live.git
cd bharat-live
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Rename `.env.example` to `.env` and fill in your API keys:
```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# External APIs
VITE_NEWSDATA_API_KEY=your_newsdata_api_key
AI_GATEWAY_API_KEY=your_openrouter_api_key
```
*(Note: If you do not provide the API keys, the app will safely fall back to mock data and disable the AI features so it doesn't crash!)*

### 4. Run the App
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to see the app!

## 🌐 Deployment
This project is fully optimized for Vercel. 
Simply push to GitHub and deploy to Vercel. Be sure to add `NODE_OPTIONS=--max_old_space_size=4096` to your Vercel Environment Variables to handle the heavy asset compilation!

## 📄 License
This project is open-source and available under the MIT License.
