# utils/ai_engine.py
import os
import hashlib
import json
import requests
import google.generativeai as genai
from huggingface_hub import InferenceClient

def get_ai_clients():
    hf_token = os.getenv("HF_API_TOKEN", "")
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    
    hf_client = InferenceClient(token=hf_token) if hf_token else None
    if gemini_key:
        genai.configure(api_key=gemini_key)
        # Use a stable version
        try:
            gemini_model = genai.GenerativeModel('gemini-2.5-flash')
        except:
            gemini_model = genai.GenerativeModel('gemini-pro')
    else:
        gemini_model = None
        
    return hf_client, gemini_model

def segment_narrative(narrative, style, model):
    if not model:
        # Simple fallback splitter if no Gemini
        import re
        segs = re.split(r'(?<=[.!?])\s+', narrative)
        scenes = []
        for i, s in enumerate(segs[:6]):
            scenes.append({
                "scene_title": f"Scene {i+1}",
                "enhanced_prompt": f"{s}. Cinematic, {style} style.",
                "speaker_notes": f"Talking points for: {s[:40]}..."
            })
        return scenes
    
    prompt = f"""
    You are an elite Film Director and Master Prompt Engineer.
    Analyze this narrative: "{narrative}"
    Apply this style: "{style}"
    Break this into 3-8 visual scenes. Return a JSON array ONLY.
    Each object must have:
    - "scene_title": Punchy title.
    - "enhanced_prompt": Detailed visual prompt for FLUX.1.
    - "speaker_notes": Clear script for the presenter.
    """
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        return json.loads(text)
    except Exception as e:
        print(f"Gemini Error: {e}")
        return []

def generate_image(prompt, index, hf_client, model_id, mock=True):
    cache_key = hashlib.md5(prompt.encode()).hexdigest()
    image_path = f"static/images/{cache_key}.png"
    url_path = f"/static/images/{cache_key}.png"
    
    if os.path.exists(image_path): return url_path
    
    if mock:
        import requests
        try:
            p_url = f"https://picsum.photos/seed/{cache_key}/800/450"
            r = requests.get(p_url, timeout=10)
            if r.status_code == 200:
                with open(image_path, 'wb') as f: f.write(r.content)
                return url_path
        except: pass
        return f"https://picsum.photos/seed/{cache_key}/800/450"

    try:
        image = hf_client.text_to_image(prompt=prompt, model=model_id)
        image.save(image_path)
        return url_path
    except Exception as e:
        print(f"HF Error Scene {index}: {e}")
        return f"https://picsum.photos/seed/{cache_key}/800/450"
