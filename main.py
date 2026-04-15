# main.py
import os
import asyncio
import json
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from utils.ai_engine import get_ai_clients, segment_narrative, generate_image

load_dotenv()

app = FastAPI(title="Pitch Visualizer Pro")
os.makedirs("static/images", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

class GenerateRequest(BaseModel):
    narrative: str
    style: str

hf_client, gemini_model = get_ai_clients()
MODEL_ID = os.getenv("MODEL_ID", "black-forest-labs/FLUX.1-schnell")
MOCK = os.getenv("MOCK_IMAGE_GEN", "True").lower() == "true"

@app.get("/")
async def index(request: Request):
    styles = ["Cinematic", "Cyberpunk", "Storyboard Sketch", "3D Render", "Glassmorphism"]
    return templates.TemplateResponse(request=request, name="index.html", context={"styles": styles})

@app.post("/generate")
async def generate(req: GenerateRequest):
    async def stream():
        print(f"Generating for: {req.narrative[:50]}...")
        scenes = await asyncio.to_thread(segment_narrative, req.narrative, req.style, gemini_model)
        
        if not scenes:
             yield f"data: {json.dumps({'type': 'error', 'msg': 'AI segmentation failed'})}\n\n"
             return

        yield f"data: {json.dumps({'type': 'planning', 'total': len(scenes)})}\n\n"
        
        for i, scene in enumerate(scenes):
            img_url = await asyncio.to_thread(generate_image, scene['enhanced_prompt'], i, hf_client, MODEL_ID, MOCK)
            scene['image_url'] = img_url
            scene['type'] = 'scene'
            scene['index'] = i
            yield f"data: {json.dumps(scene)}\n\n"
        
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    # Use PORT env var for Render/Heroku compatibility
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
