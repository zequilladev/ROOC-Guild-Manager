import json, os, calendar
from datetime import datetime, date, timedelta

DATA_FILE = os.path.join(os.path.dirname(__file__), "guild_data.json")


# ── Persistence ────────────────────────────────────────────────────────────────
def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE) as f:
            return json.load(f)
    return {"members": [], "attendance": {}, "parties": {"main": [], "sub": []}}


def save_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)


# ── League date helpers ────────────────────────────────────────────────────────
def get_league_dates(start_date_str="2026-04-14", weeks_ahead=8):
    dates, cur = [], datetime.strptime(start_date_str, "%Y-%m-%d").date()
    end = date.today() + timedelta(weeks=weeks_ahead)
    while cur <= end:
        if cur.weekday() in (1, 3):
            dates.append(f"{cur}  ({'Tuesday' if cur.weekday()==1 else 'Thursday'})")
        cur += timedelta(days=1)
    return dates


def date_key_to_date(dk):
    return datetime.strptime(dk.split("  ")[0].strip(), "%Y-%m-%d").date()


def get_months_with_data(attendance):
    months = set()
    for dk in attendance:
        try:
            d = date_key_to_date(dk)
            months.add((d.year, d.month))
        except Exception:
            pass
    today = date.today()
    months.add((today.year, today.month))
    return sorted(months)
