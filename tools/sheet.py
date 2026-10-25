"""Склейка снимков tools/out/app-*.png в один лист для просмотра: python tools/sheet.py имя-листа снимок …"""
import sys
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent / "out"


def main():
    name, shots = sys.argv[1], sys.argv[2:]
    ims = [Image.open(OUT / f"app-{n}.png") for n in shots]
    sheet = Image.new("RGB", (sum(i.width for i in ims) + 10 * (len(ims) - 1), max(i.height for i in ims)), (40, 40, 40))
    x = 0
    for im in ims:
        sheet.paste(im, (x, 0))
        x += im.width + 10
    sheet.save(OUT / f"лист-{name}.png")
    print(OUT / f"лист-{name}.png")


if __name__ == "__main__":
    main()
