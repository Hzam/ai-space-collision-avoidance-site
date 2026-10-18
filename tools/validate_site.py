"""Validate the static site: routes, lang/dir, translation keys, placeholders, referenced files."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
A = ROOT / "assets"
R = json.loads((A / "data/results.json").read_text())


def get(obj, path):
    for k in path.split("."):
        obj = obj[int(k)] if isinstance(obj, list) else obj[k]
    return obj


def keys(d, p=""):
    out = set()
    for k, v in d.items():
        out |= keys(v, p + k + ".") if isinstance(v, dict) else {p + k}
    return out


tr = {l: json.loads((A / "i18n" / f"{l}.json").read_text()) for l in ("en", "ar")}
assert keys(tr["en"]) == keys(tr["ar"]), "translation keys differ"
for lang, d in (("en", "ltr"), ("ar", "rtl")):
    html = (ROOT / lang / "index.html").read_text()
    assert f'lang="{lang}"' in html and f'dir="{d}"' in html, lang
    assert 'href="../en/"' in html or 'href="../ar/"' in html, "language switch missing"
    for key in set(re.findall(r'data-(?:i18n|list)="([^"]+)"', html)):
        if not key.startswith("ack."):
            get(tr[lang], key)
    for key in re.findall(r'data-stat="([^"|]+)', html):
        get(R, key)
    for src in re.findall(r'src="\.\./(assets/[^"]+)"', html):
        assert (ROOT / src).exists(), src
    for p in re.findall(r"\{\{([^}|]+)", json.dumps(tr[lang], ensure_ascii=False)):
        get(R, p.strip())
demo = json.loads((A / "data/demo_events.json").read_text())["events"]
for e in demo:
    for f in e["frames"]:
        assert (A / f).exists(), f
print("site OK:", len(demo), "demo events")
