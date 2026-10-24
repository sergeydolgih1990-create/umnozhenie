"""Прогон сценария интерфейса tools/ui_test.html в Edge без окна на виртуальном времени."""
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
            EDGE, "--headless=new", "--disable-gpu", "--no-first-run", "--mute-audio", f"--user-data-dir={profile}",
            "--window-size=390,844", "--virtual-time-budget=600000", "--dump-dom", (ROOT / "tools" / "ui_test.html").as_uri(),
        ], capture_output=True, timeout=300)
    dom = res.stdout.decode("utf-8", "replace")
    m = re.search(r'<pre id="result">(.*?)</pre>', dom, re.S)
    if not m:
        print("Сценарий не дошёл до конца (нет итога).")
        sys.exit(2)
    text = m.group(1).replace("&gt;", ">").replace("&lt;", "<").replace("&amp;", "&").replace("&quot;", '"')
    print(text)
    sys.exit(0 if " 0 fail" in text.splitlines()[0] else 1)


if __name__ == "__main__":
    main()
