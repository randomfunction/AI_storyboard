# The Pitch Visualizer

Turn your startup narrative into a cinematic sales deck in seconds.

## Setup Instructions

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
2. **Configure environment Variables:**
   - Open `.env`.
   - Add your `HF_API_TOKEN` if you want real image generation.
   - For rapid UI development without hitting rate limits, keep `MOCK_IMAGE_GEN=True`.
3. **Run the server:**
   ```bash
   uvicorn app:app --reload
   ```
4. **View:** Open `http://localhost:8000` in your browser.

## Why This Wins: Business Utility

- **PDF Export:** Transforms ephemeral browser output into a shareable, boardroom-ready artifact. This is a complete sales deck that survives the demo.
- **Speaker Notes Generation:** Every slide ships with scripted talking points, reducing rep prep time from hours to zero and ensuring message consistency across the sales team.
- **Mock Caching & Dev Velocity:** The `MOCK_IMAGE_GEN` flag and MD5 prompt hashing decouple UI development from API rate limits, enabling rapid iteration without burning quota.
# AI_storyboard
