import io
import time

from dotenv import load_dotenv

load_dotenv()
from PIL import Image, ImageDraw
import ai


def sample_preview() -> bytes:
    img = Image.new("RGB", (768, 576), (120, 170, 220))   # sky
    d = ImageDraw.Draw(img)
    d.rectangle((0, 400, 768, 576), fill=(80, 140, 70))    # grass
    d.ellipse((520, 60, 640, 180), fill=(255, 210, 60))    # sun
    d.ellipse((250, 300, 450, 420), fill=(230, 140, 60))   # orange body
    d.ellipse((380, 250, 480, 340), fill=(230, 140, 60))   # head
    buf = io.BytesIO()
    img.save(buf, "JPEG")
    return buf.getvalue()


providers = ai.configured_providers()
print("providers in order:", providers or "NONE configured", flush=True)

platforms = ["instagram_feed", "x"]
for name in providers:
    print(f"\n--- testing {name} ---", flush=True)
    start = time.time()
    try:
        result, usage = ai.run_provider(
            name,
            "Look: warm and vibrant. Tone: fun and casual. A sunny day outdoors",
            [{"index": 0, "type": "image"}],
            [(0, sample_preview())],
            platforms,
        )
        plan, copy = ai.sanitize(result, 1, "", platforms)
        print(f"{name}: OK in {time.time() - start:.0f}s")
        print("  tokens reported or estimated:", usage)
        if name == "cloudflare":
            print("  request style that worked (0=response_format, 1=guided_json, 2=prompt only):", ai._CF_STYLE)
        print("  edit:", {k: plan[k] for k in ("saturation", "contrast", "grayscale", "zoom")},
              "focus:", plan["focus"])
        for pid, c in copy.items():
            print(f"  {pid}: {c['caption'][:110]!r}  tags={c['tags']}")
    except Exception as e:
        print(f"{name}: FAILED after {time.time() - start:.0f}s: {ai.mask(str(e))[:700]}")