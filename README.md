# 🎬 Pitch Visualizer Pro

The Pitch Visualizer is a scalable, AI-powered service that ingests narrative text and programmatically constructs a stunning, multi-panel visual storyboard. Let your sales and creative teams generate personalized pitch decks in seconds.

## ✨ Core Features & Hackathon Requirements Met:
- **Text Input & Narrative Segmentation:** Takes unstructured paragraph data and intelligently structures it into cohesive cinematic scenes using a dedicated LLM Director agent.
- **Intelligent Prompt Engineering:** For every segment, the backend utilizes Google Gemini to dynamically inject visual keywords (lighting, camera angle, character features) over simply returning the sentence verbatim.
- **Image Generation:** Assembles high-quality artwork asynchronously by streaming individual engineered prompts to Hugging Face's `FLUX.1-schnell` API.
- **Storyboard Presentation:** Minimalist, real-time-updating web UI (via Server-Sent Events) that couples the final generated panel alongside speaker scripts.

## 🚀 Bonus Objectives Addressed:
- [x] **Visual & Character Consistency:** Enforced by appending core 'style' and 'character memory' tags to every sequential image prompt in the LLM pipeline.
- [x] **User-Selectable Styles:** Five diverse artistic filters dynamically fed into the LLM logic layer.
- [x] **LLM-Powered Prompt Refinement:** Employs `gemini-1.5-flash` natively to adapt raw human text into specific diffusion-model syntax.
- [x] **Dynamic UI & Streaming:** Modern real-time UI without polling, masked by initial loading techniques.
- [x] **PDF Export Support:** Generates a downloadable high-resolution Pitch Presentation deck entirely client-side.

## 🛠️ Tech Stack
* **Core:** Python, FastAPI, SSE (Server-Sent Events)
* **Frontend:** Vanilla JavaScript, Minimalist CSS design system
* **AI Models:** Google Gemini (Director LLM Layer), FLUX.1 (Visual Generator)
* **Packaging:** Gunicorn mapped for PaaS deployments (Render / Railway)

## 📦 How to Run

1. Clone repo, init environment:
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

2. Configure Secrets in `.env`:
```
HF_API_TOKEN=your-hf-token
GEMINI_API_KEY=your-gemini-key
```

3. Launch:
```bash
uvicorn main:app --reload
```
