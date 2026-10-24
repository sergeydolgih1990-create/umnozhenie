"""Снимки макетов через Edge без окна: каждый экран каждой темы отдельным PNG в tools/out."""
import subprocess
import sys
import tempfile
from pathlib import Path

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "tools" / "out"
SCREENS = ["home", "round", "review", "result", "map"]
THEMES = ["space", "dragon", "pirate"]


def shoot(query, name, size):
    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / f"{name}.png"
    url = (ROOT / "mockups.html").as_uri() + "?" + query
    with tempfile.TemporaryDirectory() as profile:
        subprocess.run([
            EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
            f"--user-data-dir={profile}", f"--window-size={size}", "--virtual-time-budget=6000",
            f"--screenshot={target}", url,
        ], check=True, capture_output=True, timeout=90)
    print(target)


def main():
    only = sys.argv[1:] or SCREENS + ["heroes"]
    for screen in only:
        if screen == "heroes":
            shoot("solo=heroes", "heroes", "1100,1320")
            continue
        for theme in THEMES:
            shoot(f"solo={screen}&theme={theme}", f"{screen}-{theme}", "390,844")


if __name__ == "__main__":
    main()
