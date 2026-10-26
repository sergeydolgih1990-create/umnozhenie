"""Снимки готового приложения на демонстрационных данных (index.html?demo...) в tools/out/app-*.png.
Запуск: python tools/shoot_app.py [имя-снимка …]; без аргументов — все."""
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import urlencode

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "tools" / "out"
PHONE, TABLET, PC = "390,844", "820,1180", "1366,768"
PLAYERS = {"space": "p1", "dragon": "p2", "pirate": "p3"}

SHOTS = {}
for theme, pid in PLAYERS.items():
    SHOTS[f"home-{theme}"] = (f"player={pid}", PHONE)
    SHOTS[f"round-{theme}"] = (f"player={pid}&play=school&upto=4", PHONE)
    SHOTS[f"result-{theme}"] = (f"player={pid}&play=school&upto=16&stage=result", PHONE)
SHOTS.update({
    "players": ("screen=players", PHONE),
    "packages": ("screen=packages", PHONE),
    "pkgform": ("screen=pkgForm", PHONE),
    "playerform": ("screen=playerForm", PHONE),
    "fast": ("player=p2&play=fast&upto=7", PHONE),
    "minute": ("player=p3&play=minute&upto=9", PHONE),
    "streak": ("player=p1&play=streak&upto=3", PHONE),
    "dictation": ("player=p3&play=dictation&upto=3", PHONE),
    "review": ("player=p1&play=dictation&upto=16&stage=review", PHONE),
    "review-fast": ("player=p2&play=limit&upto=20&stage=review", PHONE),
    "map": ("screen=map&op=m", PHONE),
    "map-div": ("player=p3&screen=map&op=d", PHONE),
    "records": ("screen=records&tab=rec", PHONE),
    "history": ("screen=records&tab=hist", PHONE),
    "charts": ("screen=charts&pkg=all&metric=pct", PHONE),
    "charts-err": ("player=p3&screen=charts&pkg=school&metric=errors", PHONE),
    "prizes": ("screen=prizes", PHONE),
    "parent": ("screen=parent", PHONE),
    "keys-round": ("player=p1&input=keys&play=school&upto=3", PHONE),
    "keys-small": ("player=p2&input=keys&play=fast&upto=4", "360,640"),
    "keys-dict": ("player=p3&input=keys&play=dictation&upto=5", PHONE),
    "dict-long": ("player=p1&input=keys&play=dictation&upto=14", PHONE),
    "dict-long-small": ("player=p2&input=keys&play=dictation&upto=14", "360,640"),
    "keys-result": ("player=p2&input=keys&play=school&upto=16&stage=result", PHONE),
    "keys-pc": ("player=p1&input=keys&play=school&upto=2", PC),
    "help": ("screen=help", PHONE),
    "exams": ("screen=exams", PHONE),
    "exams-pirate": ("player=p3&screen=exams", PHONE),
    "exam-round": ("player=p2&exam=mulonly&upto=5", PHONE),
    "exam-fail": ("player=p1&exam=school&upto=16&stage=result", PHONE),
    "win-space": ("player=p1&exam=school&upto=16&stage=result&clean", PHONE),
    "win-dragon": ("player=p2&play=school&upto=16&stage=result&clean", PHONE),
    "win-pirate": ("player=p3&exam=mulonly&upto=20&stage=result&clean", PHONE),
    "exams-dragon": ("player=p2&screen=exams&open", PHONE),
    "tap-space": ("player=p1&tap=1", PHONE, 900),
    "tap-dragon": ("player=p2&tap=3", PHONE, 900),
    "tap-pirate": ("player=p3&tap=2", PHONE, 1100),
    "fx-combo": ("player=p2&input=keys&play=school&upto=5&clean&fx", PHONE, 60),
    "win-early": ("player=p3&exam=mulonly&upto=20&stage=result&clean", PHONE, 1700),
    "small-lose": ("player=p1&exam=school&upto=16&stage=result", "360,640"),
    "small-win": ("player=p3&exam=mulonly&upto=20&stage=result&clean", "360,640"),
    "small-minute": ("player=p3&input=keys&play=minute&upto=9", "360,640"),
    "small-school": ("player=p1&input=keys&play=school&upto=5&clean&fx", "360,640", 60),
    "small-tap": ("player=p1&tap=1", "360,640", 900),
    "win-noanim": ("player=p1&exam=school&upto=16&stage=result&clean&noanim", PHONE),
    "exam-pc": ("player=p3&screen=exams", PC),
    "help-pirate": ("player=p3&screen=help", TABLET),
    "round-tablet": ("player=p2&play=school&upto=6", TABLET),
    "home-tablet": ("player=p3", TABLET),
    "round-pc": ("player=p1&play=fast&upto=5", PC),
    "home-pc": ("player=p1", PC),
})


def shoot(name, query, size, budget=4000):
    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / f"app-{name}.png"
    w, h = size.split(",")
    url = (ROOT / "tools" / "frame.html").as_uri() + "?" + urlencode({"w": w, "h": h, "q": "demo&" + query})
    with tempfile.TemporaryDirectory() as profile:
        subprocess.run([
            EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--mute-audio",
            f"--user-data-dir={profile}", f"--window-size={size}", f"--virtual-time-budget={budget}",
            f"--screenshot={target}", url,
        ], check=True, capture_output=True, timeout=90)
    print(target)


def main():
    names = sys.argv[1:] or list(SHOTS)
    for n in names:
        shoot(n, *SHOTS[n])


if __name__ == "__main__":
    main()
