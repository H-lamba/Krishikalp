<div align="center">

# 🌾 KrishiKalp

### *Your AI-Powered Agricultural Partner*

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)

---

**KrishiKalp** bridges the gap between traditional farming and modern AI technology — delivering **7 intelligent services**, a **farmer marketplace**, and a **community forum** in one unified platform.

[Explore Services](#-services) · [View Architecture](#-architecture) · [Get Started](#-getting-started) · [AI Deep Dive](#-ai--ml-deep-dive)

</div>

---

## 📸 Platform Highlights

<div align="center">

| 🧑‍🌾 5,000+ Farmers | 📦 1,000+ Listings | 💰 ₹10Cr+ Monthly Trading |
|:---:|:---:|:---:|
| Registered on the platform | Active marketplace products | Volume across the network |

</div>

---

## ✨ Features

### 🤖 AI-Powered Services (7 Total)

| # | Service | AI Engine | Description |
|:-:|---------|:---------:|-------------|
| 1 | **Crop Recommendation** | `scikit-learn` | Suggests the optimal crop based on soil NPK, pH, temperature, humidity, and rainfall |
| 2 | **Fertilizer Recommendation** | `scikit-learn` | Recommends the best fertilizer using soil & crop data with one-hot encoded features |
| 3 | **Plant Disease Detection** | `Gemini Vision` | Upload a leaf photo → AI identifies the plant and diagnoses diseases in real time |
| 4 | **Crop Yield Prediction** | `Gemini LLM` | Predicts expected harvest yield from location, crop type, area, and soil |
| 5 | **Market Price Prediction** | `Gemini LLM` | Forecasts crop market prices for strategic selling decisions |
| 6 | **Irrigation Management** | `Gemini LLM` | Smart watering recommendations based on crop, soil, weather, and rain history |
| 7 | **Weather-Based Planning** | `Gemini LLM` + `Open-Meteo` | Generates a 7-day farm operations plan using real-time weather forecasts |

### 🛒 Farmer Marketplace
- **Direct farmer-to-buyer trading** — no middlemen
- Verified buyer network with trust indicators
- Crop listing, search, and category filters
- Built on Supabase for real-time data

### 👥 Community Forum
- **Resource sharing** — Equipment, Supplies, Seeds, Labor, Knowledge
- Distance-based discovery (1–50 mile radius)
- Photo uploads and location tagging
- Filter by resource category

### 🔐 Authentication
- Secure email/password auth via **Supabase**
- User profiles with full name and email
- Protected service pages — login required to access AI tools
- Dynamic Login/Logout state management

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     FRONTEND (Port 5500)                 │
│  ┌──────────┐  ┌────────────┐  ┌───────────┐  ┌──────┐  │
│  │ Landing  │  │  Services  │  │Marketplace│  │Forum │  │
│  │  Page    │  │  (8 pages) │  │           │  │      │  │
│  └────┬─────┘  └─────┬──────┘  └─────┬─────┘  └──┬───┘  │
│       │              │               │            │      │
│       └──────────────┼───────────────┼────────────┘      │
│                      │               │                   │
│              ┌───────▼───────┐ ┌─────▼──────┐            │
│              │ service-      │ │ Supabase   │            │
│              │ worker.js     │ │ JS Client  │            │
│              └───────┬───────┘ └─────┬──────┘            │
└──────────────────────┼───────────────┼───────────────────┘
                       │               │
              ┌────────▼────────┐ ┌────▼──────────────┐
              │  FastAPI Server │ │  Supabase Cloud   │
              │  (Port 8000)    │ │  (Auth + Database) │
              │                 │ └───────────────────┘
              │  ┌───────────┐  │
              │  │ Local ML  │  │
              │  │ Models    │  │ ◄── Navis_Base.pkl
              │  │ (sklearn) │  │ ◄── fertikizer.pkl
              │  └───────────┘  │
              │  ┌───────────┐  │
              │  │ Google    │  │
              │  │ Gemini    │  │ ◄── gemini-2.5-flash
              │  │ API       │  │
              │  └───────────┘  │
              └─────────────────┘
```

---

## 🧠 AI / ML Deep Dive

### Local Models (Classical ML)

<details>
<summary><b>🌱 Crop Recommendation — Navis_Base.pkl</b></summary>

- **Algorithm:** scikit-learn classifier (pre-trained)
- **Input Features (7):** Nitrogen, Phosphorus, Potassium, Temperature, Humidity, pH, Rainfall
- **Output:** Best crop name (e.g., "Rice", "Wheat", "Cotton")
- **Serving:** Loaded via `pickle.load()` at startup

</details>

<details>
<summary><b>🧪 Fertilizer Recommendation — fertikizer.pkl</b></summary>

- **Algorithm:** scikit-learn classifier with LabelEncoder
- **Input Features (22):** 6 numeric (Temp, Humidity, Moisture, N, P, K) + 5 one-hot Soil Types + 11 one-hot Crop Types
- **Soil Types:** Black, Clayey, Loamy, Red, Sandy
- **Crop Types:** Barley, Cotton, Ground Nuts, Maize, Millets, Oil Seeds, Paddy, Pulses, Sugarcane, Tobacco, Wheat
- **Output:** Fertilizer name (decoded via `label_encoder.pkl`)

</details>

### Cloud AI (Google Gemini)

<details>
<summary><b>🔬 Plant Disease Detection — Multimodal Vision</b></summary>

- **Model:** `gemini-2.5-flash-preview-09-2025`
- **Input:** Leaf image (uploaded by farmer)
- **Persona:** "You are a plant pathologist"
- **Output Format:** `Plant: [Name], Disease: [Name]` or `Disease: Healthy`
- **Error Handling:** 3 retries with exponential backoff (2s, 4s, 8s)

</details>

<details>
<summary><b>📊 Yield / Market / Irrigation — Text Generation</b></summary>

Each uses a specialized persona prompt:
| Service | Gemini Persona | Output Prefix |
|---------|---------------|--------------|
| Yield Prediction | "Agricultural expert" | `Estimated Yield:` |
| Market Prediction | "Agricultural market analyst" | `Market Forecast:` |
| Irrigation Advice | "Irrigation specialist" | `Irrigation Advice:` |

</details>

<details>
<summary><b>🌦️ Weather Planning — Multi-API Pipeline</b></summary>

```
User Location → Open-Meteo Geocoding → Lat/Lon
    → Open-Meteo Forecast (7 days) → Weather Data
    → Gemini LLM → Actionable 7-Day Farm Plan
```

Forecast data includes: daily max/min temperature + precipitation totals.

</details>

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.8+**
- **Node.js** (optional — only for Live Server)
- **Google Gemini API Key** — [Get one here](https://aistudio.google.com/app/apikey)
- **VS Code** with Live Server extension (recommended)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/KrishiKalp.git
cd KrishiKalp

# 2. Install Python dependencies
cd server
pip install -r requirements.txt
```

### Running the Application

You need **two terminals** running simultaneously:

#### Terminal 1 — Backend (FastAPI)

```powershell
cd server

# Set your Gemini API key (required every new terminal session)
$env:GOOGLE_API_KEY="your-api-key-here"

# Start the API server
uvicorn api:app --reload
# → Runs on http://127.0.0.1:8000
```

#### Terminal 2 — Frontend (Live Server)

1. Open the project root in VS Code
2. Right-click `index.html` → **Open with Live Server**
3. Visit `http://127.0.0.1:5500`

> **That's it!** The frontend on port 5500 makes API calls to the backend on port 8000.

---

## 📁 Project Structure

```
KrishiKalp/
├── 📄 index.html                # Landing page
├── 🎨 style.css                 # Global styles
├── 🎨 contact.css               # Contact section styles
├── 🔐 auth.js                   # Supabase auth (login/signup)
├── 🛡️ auth-guard.js             # Page protection middleware
├── 📘 Run.md                    # Setup instructions
│
├── 🖥️ server/
│   ├── api.py                   # FastAPI — all AI endpoints
│   ├── Navis_Base.pkl           # Crop recommendation model
│   ├── fertikizer.pkl           # Fertilizer recommendation model
│   ├── label_encoder.pkl        # Fertilizer label decoder
│   └── requirements.txt        # Python dependencies
│
├── ⚙️ Services/
│   ├── services.html            # Services hub page
│   ├── service-worker.js        # Frontend ↔ API connector
│   ├── crop-recommendation.html
│   ├── disease-detection.html
│   ├── fertilizer-recommendation.html
│   ├── yield-prediction.html
│   ├── weather-planning.html
│   ├── market-prediction.html
│   ├── irrigation-management.html
│   └── expert-consultation.html
│
├── 🛒 Market Place Page/
│   ├── Marketplace.html
│   ├── marketplace.css
│   └── marketplace.js
│
└── 👥 Community/
    ├── Community.html
    ├── style.css
    ├── exchange.css
    └── script.js
```

---

## 🔌 API Reference

| Method | Endpoint | Body | Response Key |
|:------:|----------|------|:------------:|
| `GET` | `/` | — | `message` |
| `POST` | `/predict_crop` | `{ nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall }` | `crop` |
| `POST` | `/predict_fertilizer` | `{ temperature, humidity, moisture, nitrogen, potassium, phosphorous, soil_type, crop_type }` | `fertilizer` |
| `POST` | `/predict_disease` | `multipart/form-data` (file) | `disease` |
| `POST` | `/predict_yield` | `{ location, crop_type, area, soil_type }` | `prediction` |
| `POST` | `/predict_market` | `{ crop_type, market_location, timeframe }` | `prediction` |
| `POST` | `/predict_irrigation` | `{ crop_type, soil_type, last_rain, temp }` | `prediction` |
| `POST` | `/predict_weather_plan` | `{ location, forecast_data }` | `prediction` |

---

## 🛠 Tech Stack

<div align="center">

| Frontend | Backend | AI/ML | Database | APIs |
|:--------:|:-------:|:-----:|:--------:|:----:|
| HTML5 | FastAPI | scikit-learn | Supabase | Open-Meteo |
| CSS3 | Uvicorn | Google Gemini | PostgreSQL | Geocoding |
| JavaScript | Python | Pillow | — | — |
| Font Awesome | Pydantic | NumPy / Pandas | — | — |

</div>

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**Made with ❤️ for Indian Farmers**

🌾 *Empowering agriculture through technology* 🌾

</div>
