"""Прогон tests.html в Edge без окна; печатает итог и упавшие проверки, код выхода 1 при ошибках."""
import re
import subprocess
import sys
import tempfile
from pathlib import Path

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
ROOT = Path(__file__).resolve().parent.parent


def main():
    with tempfile.TemporaryDirectory() as profile:
        res = subprocess.run([
            EDGE, "--headless=new", "--disable-gpu", "--no-first-run", f"--user-data-dir={profile}",
            "--virtual-time-budget=20000", "--dump-dom", (ROOT / "tests.html").as_uri(),
        ], capture_output=True, timeout=120)
    dom = res.stdout.decode("utf-8", "replace")
    m = re.search(r'<pre id="result">(.*?)</pre>', dom, re.S)
    if not m:
        print("Нет результата проверок. Ошибка скрипта?")
        print(dom[-2000:])
        sys.exit(2)
    text = m.group(1).replace("&gt;", ">").replace("&lt;", "<").replace("&amp;", "&").replace("&quot;", '"')
    print(text)
    sys.exit(1 if " 0 fail" not in text.splitlines()[0] else 0)


if __name__ == "__main__":
    main()
