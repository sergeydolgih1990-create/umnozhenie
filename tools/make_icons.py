"""Значок тренажёра: рисует SVG и снимает его Edge без окна в icons/icon-192.png и icon-512.png."""
import subprocess
import tempfile
from pathlib import Path

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
ROOT = Path(__file__).resolve().parent.parent

SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a1468"/><stop offset="1" stop-color="#7c4dff"/></linearGradient></defs>
<rect width="512" height="512" fill="url(#g)"/>
<circle cx="96" cy="120" r="5" fill="#fff" opacity=".8"/><circle cx="420" cy="96" r="4" fill="#fff" opacity=".7"/>
<circle cx="70" cy="380" r="4" fill="#fff" opacity=".6"/><circle cx="440" cy="400" r="6" fill="#fff" opacity=".7"/>
<circle cx="256" cy="262" r="150" fill="#fff"/>
<path d="M196 202L316 322M316 202L196 322" stroke="#ff8a3d" stroke-width="46" stroke-linecap="round"/>
<path d="M360 112L372 142L404 144L379 164L388 195L360 177L332 195L341 164L316 144L348 142Z" fill="#ffc531" stroke="#b47f00" stroke-width="6" stroke-linejoin="round"/>
</svg>"""


def main():
    out = ROOT / "icons"
    out.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        page = Path(tmp) / "icon.html"
        page.write_text("<!doctype html><html><body style='margin:0;overflow:hidden'>" + SVG + "</body></html>", encoding="utf-8")
        for size in (192, 512):
            target = out / f"icon-{size}.png"
            subprocess.run([
                EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
                f"--user-data-dir={Path(tmp) / 'p'}", f"--window-size={size},{size}",
                f"--screenshot={target}", page.as_uri(),
            ], check=True, capture_output=True, timeout=90)
            print(target)


if __name__ == "__main__":
    main()
