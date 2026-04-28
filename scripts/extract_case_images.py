"""Walk the source .docx files in document order, extract each embedded image,
compress (PNG → JPEG q=85), and save it as the cover image for the matching
case. Then patch frontend/public/cases/<slug>/cover.jpg references back into
backend/seeds/cases.json.

Run from project root:
    backend/.venv/bin/python scripts/extract_case_images.py
"""
from __future__ import annotations

import io
import json
from pathlib import Path

import docx
from docx.oxml.ns import qn
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = ROOT / "frontend" / "public" / "cases"
SEED = ROOT / "backend" / "seeds" / "cases.json"

# Doc-order → case slug. One entry per embedded image; None to skip.
PLAN: list[tuple[Path, list[str | None]]] = [
    (
        DATA / "Кейс тапсырма 2026.docx",
        [
            "greenhouse",
            "street-light",
            "traffic-light",
            "parking",
            "library",
            "wind-generator",
        ],
    ),
    (
        DATA / "Оптика және энергия кейстері.docx",
        [
            "lens-projector",
            "fiber-optics",
            "mirror-message",
            "periscope",
            "hologram",
            "simple-machines",
            "heat-insulation",
            "power-experiment",
            "motion-energy",
        ],
    ),
    (
        DATA / "кейс.docx",
        [
            "heat-house",
            "greenhouse-temp",
            "smart-thermos",
            "mini-container",
            "pneumo-chamber",
            # Кейс 10 (emergency-light) has no embedded image — skip,
            # the next image belongs to Кейс 11 (liquid-rheostat).
            "liquid-rheostat",
            "smart-house",
            "classroom-energy",
            "maglev",
            "magnet-sorting",
        ],
    ),
]

# Slug → STEMCase.title_kk so we can patch the seed JSON.
SLUG_TO_TITLE = {
    "greenhouse": "Ақылды жылыжай жобасы",
    "street-light": "Ақылды көше жарығы жүйесі",
    "traffic-light": "Ақылды бағдаршам жүйесі",
    "parking": "Ақылды тұрақ жүйесі",
    "library": "Кітапханадағы жарық жүйесі",
    "wind-generator": "Мектеп ауласындағы жел генераторы",
    "lens-projector": "Мектептегі көрме: қарапайым проектор",
    "fiber-optics": "Қаладағы интернет: оптоталшықты модель",
    "mirror-message": "Жасырын хабар: айналар арқылы белгі беру",
    "periscope": "Мектептегі үзіліс: қарапайым перископ",
    "hologram": "Ұшатын бейнелер: голограмма пирамидасы",
    "simple-machines": "Құрылыс алаңы: қарапайым механизмдер",
    "heat-insulation": "Энергияны нестейміз? — Жылу оқшаулайтын үй",
    "power-experiment": "Тез әлде Баяу? — Қуат туралы зерттеу",
    "motion-energy": "Қаладағы қозғалыс: қозғалыстан электр",
    "heat-house": "Үйді тиімді жылыту",
    "greenhouse-temp": "Жылыжайдағы температураны тұрақтандыру",
    "smart-thermos": "Ақылды термос",
    "mini-container": "Қысым: қауіпсіз мини-контейнер",
    "pneumo-chamber": "Пневмо-қысым камерасы",
    "emergency-light": "Апаттық жағдайдағы жарық",
    "liquid-rheostat": "Сұйық реостат: жарықты қалай басқарамыз",
    "smart-house": "Ақылды үй: электр энергиясын тиімді пайдалану",
    "classroom-energy": "Сыныптағы электр энергиясының артық шығыны",
    "maglev": "Үйкеліссіз қозғалыс: маглев пойыз моделі",
    "magnet-sorting": "Ақылды сұрыптау: магниттің қалдықтарға әсері",
}

JPEG_QUALITY = 82
MAX_DIM = 1600  # downscale very large source images


def extract(doc_path: Path, slugs: list[str | None]) -> list[tuple[str, Path]]:
    saved: list[tuple[str, Path]] = []
    doc = docx.Document(str(doc_path))
    idx = 0
    for p in doc.paragraphs:
        for run in p.runs:
            for blip in run._element.findall(".//" + qn("a:blip")):
                rid = blip.get(qn("r:embed"))
                if not rid:
                    continue
                if idx >= len(slugs):
                    print(f"  [warn] extra image #{idx + 1} beyond plan, skipping")
                    idx += 1
                    continue
                slug = slugs[idx]
                idx += 1
                if not slug:
                    continue

                blob = doc.part.related_parts[rid].blob
                img = Image.open(io.BytesIO(blob))
                if img.mode in ("RGBA", "P"):
                    bg = Image.new("RGB", img.size, "white")
                    bg.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
                    img = bg
                if max(img.size) > MAX_DIM:
                    img.thumbnail((MAX_DIM, MAX_DIM), Image.LANCZOS)

                target_dir = OUT / slug
                target_dir.mkdir(parents=True, exist_ok=True)
                target = target_dir / "cover.jpg"
                img.save(target, "JPEG", quality=JPEG_QUALITY, optimize=True)
                kb = target.stat().st_size // 1024
                print(f"  · {slug:<22} {kb:>4} KB  ({img.size[0]}×{img.size[1]})")
                saved.append((slug, target))
    return saved


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    saved_slugs: set[str] = set()
    for path, slugs in PLAN:
        print(f"\n=== {path.name} ===")
        for slug, _ in extract(path, slugs):
            saved_slugs.add(slug)

    # Patch the seed JSON.
    cases = json.loads(SEED.read_text(encoding="utf-8"))
    title_to_slug = {title: slug for slug, title in SLUG_TO_TITLE.items()}
    patched = 0
    for case in cases:
        slug = title_to_slug.get(case["title_kk"])
        if not slug or slug not in saved_slugs:
            continue
        case["cover_image_url"] = f"/cases/{slug}/cover.jpg"
        patched += 1
    SEED.write_text(
        json.dumps(cases, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"\nPatched {patched} cover_image_url entries in {SEED.name}")


if __name__ == "__main__":
    main()
