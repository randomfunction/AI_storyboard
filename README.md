<div align="center">
  <h1>Pitch Visualizer</h1>
  <p>Transform raw narrative text into professional, AI-generated visual pitch decks in seconds.</p>
</div>

<br>

<div align="center">
  <img src="Flowchart.png" alt="System Architecture Flowchart" width="450"/>
</div>

<br>

## Core Workflow
1. **Intelligent Scene Director:** Extracts themes, key moments, and speaker notes from your raw text using **Gemini 1.5 Flash**.
2. **Parallel Gen-AI Rendering:** Converts the engineered prompts into high-res cinematic images utilizing **FLUX.1-schnell**.
3. **Real-time Streaming Engine:** Uses **Server-Sent Events (SSE)** to stream the pitch deck live to the client UI as each individual scene completes.
4. **Export Engine:** One-click client-side compiler to generate downloadable PDF presentations.

## Key Technical Highlights
- **Strict Visual & Character Consistency:** The backend explicitly enforces a persistent "Visual Memory Tag" into all diffusion prompts to guarantee artistic continuity between varying scenes.
- **Optimized Caching Pipeline:** Implements MD5-hashed image caching based on prompt signatures to drastically reduce external API wait times and bandwidth costs.
- **Production-Ready Dockerization:** Fully containerized with a lightweight `python:3.12-slim` image and managed via Gunicorn workers for immediate platform-as-a-Service deployments (e.g., Render, Railway).
- **Premium SaaS UI/UX:** Responsive, minimalist light/dark design architecture featuring custom hardware-accelerated animations and an async loading layer.

## Run Locally

```bash
# 1. Setup
git clone https://github.com/randomfucntion/pitch_visual.git
cd pitch_visual

# 2. Add API Secrets
# Edit .env file and add:
# HF_API_TOKEN=your_token
# GEMINI_API_KEY=your_key

# 3. Launch via Docker
docker build -t pitchvisual .
docker run -p 8000:8000 --env-file .env pitchvisual
```

*(Alternatively, run natively: `pip install -r requirements.txt && uvicorn main:app`)*
