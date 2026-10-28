import os

from dotenv import load_dotenv

load_dotenv()
from google import genai
from google.genai import types
import ai

key = os.environ.get("GEMINI_API_KEY")
model = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")
print("key set:", bool(key), "| model:", model)

client = genai.Client(api_key=key)
try:
    r = client.models.generate_content(model=model, contents="Reply with the single word: ready")
    print("1. basic call OK:", r.text.strip())
except Exception as e:
    print("1. basic call FAILED:", type(e).__name__, str(e).replace(key or "", "***")[:600])
    raise SystemExit(1)

try:
    r = client.models.generate_content(
        model=model,
        contents=ai.build_prompt("Look: warm and vibrant. Tone: fun and casual. cute cat",
                                 [{"index": 0, "type": "image"}], ["instagram_feed", "x"]),
        config=types.GenerateContentConfig(
            system_instruction=ai.SYSTEM,
            response_mime_type="application/json",
            response_schema=ai.GenieResult,
        ),
    )
    print("2. structured call OK. Instagram caption:", r.parsed.posts[0].caption[:120])
except Exception as e:
    print("2. structured call FAILED:", type(e).__name__, str(e).replace(key or "", "***")[:600])