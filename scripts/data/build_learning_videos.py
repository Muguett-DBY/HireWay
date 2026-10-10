"""Build the curated video catalogue; verify live metadata before writing.

Use --offline to reproduce the recorded snapshot without network access.
YouTube videoDetails.lengthSeconds is the canonical playback duration; other
watch-page lengthSeconds fields can round the same introduction up by a second.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import urllib.request

from data_build_utils import iso_date

ROOT = Path(__file__).resolve().parents[2]
OUTPUT_PATH = ROOT / "data/learning_videos.json"

CHANNEL_ID_FREECODECAMP = "UC8butISFwT-Wl7EV0hUK0BQ"
VERIFIED_AT = "2026-10-11"

# (videoId, title, durationSeconds) - all verified against YouTube on
# 2026-10-11 via oEmbed + player videoDetails.lengthSeconds.
V = {
    "rfscVS0vtbw": ("Learn Python - Full Course for Beginners [Tutorial]", 16012),
    "kLZgQWjnUz0": ("Learn Python – Interactive Course 2026", 14915),
    "HXV3zeQKqGY": ("SQL Tutorial - Full Database Course for Beginners", 15639),
    "PkZNo7MFNFg": ("Learn JavaScript - Full Course for Beginners", 12403),
    "nqK3oJ682mQ": ("Kotlin Course For Beginners – Full Tutorial", 37693),
    "AeC4G-H-MQA": ("Kotlin Programming Fundamentals Tutorial - Full Course", 14997),
    "EExSSotojVI": ("Learn Kotlin Programming – Full Course for Beginners", 47935),
    "qw--VYLpxG4": ("Learn PostgreSQL Tutorial - Full Course for Beginners", 15574),
    "gYTA8nQN030": ("TimescaleDB Course – PostgreSQL for Time-Series Data", 15601),
    "Vl0H-qTclOg": ("Microsoft Excel Tutorial for Beginners - Full Course", 8769),
    "gvhsKtjAmgc": ("Excel Formulas & Functions – Full Course", 6075),
    "TPMlZxRRaBQ": ("Tableau for Data Science and Data Visualization - Crash Course Tutorial", 1722),
    "PSNXoAs2FtQ": ("Data Analyst Bootcamp for Beginners (SQL, Tableau, Power BI, Python, Excel, Pandas, Projects, more)", 69826),
    "_V8eKsto3Ug": ("R Programming Tutorial - Learn the Basics of Statistical Computing", 7839),
    "vLnPwxZdW4Y": ("C++ Tutorial for Beginners - Full Course", 14478),
    "comQ1-x2a1Q": ("Swift Tutorial - Full Course for Beginners", 11398),
}


def duration(seconds: int) -> str:
    minutes, sec = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    return f"{hours}:{minutes:02d}:{sec:02d}"


def video(video_id: str) -> dict:
    title, seconds = V[video_id]
    return {
        "id": video_id,
        "title": title,
        "channel": "freeCodeCamp.org",
        "channelId": CHANNEL_ID_FREECODECAMP,
        "durationSeconds": seconds,
        "duration": duration(seconds),
        "verifiedAt": VERIFIED_AT,
    }


# Keys must match the app's visible skill names (skill catalogue, which is
# anchored to O*NET software skill and element names).
SKILLS = {
    "Python": ["rfscVS0vtbw", "kLZgQWjnUz0"],
    "SQL": ["HXV3zeQKqGY"],
    "JavaScript": ["PkZNo7MFNFg"],
    "Kotlin": ["nqK3oJ682mQ", "AeC4G-H-MQA", "EExSSotojVI"],
    "PostgreSQL": ["qw--VYLpxG4", "gYTA8nQN030"],
    "Microsoft Excel": ["Vl0H-qTclOg", "gvhsKtjAmgc"],
    "Tableau": ["TPMlZxRRaBQ"],
    "Power BI": ["PSNXoAs2FtQ"],
    "R": ["_V8eKsto3Ug"],
    "C++": ["vLnPwxZdW4Y"],
    "Swift": ["comQ1-x2a1Q"],
}

INTRODUCTIONS = {
    "SQL": ("E5e-l7C0CKc", "SQL Introduction | HireWay Skills", 90),
    "Thomson Reuters Westlaw": ("IUUvvRpbOWg", "Westlaw Legal Research Introduction | HireWay Skills", 91),
    "Intuit QuickBooks": ("CaveHUCSBAE", "QuickBooks Bookkeeping Introduction | HireWay Skills", 92),
    "Google Analytics": ("wa58lNINq9o", "Google Analytics Marketing Introduction | HireWay Skills", 90),
    "Autodesk AutoCAD": ("jqNQqgzTRRI", "AutoCAD Introduction | HireWay Skills", 90),
}
INTRO_CHANNEL_ID = "UCzii16yGyzYwcziU3RHzmoQ"
INTRO_VERIFIED_AT = "2026-10-11"

def build_catalogue() -> dict:
    data = {
        "meta": {
            "generated": INTRO_VERIFIED_AT,
            "source": (
                "Curated freeCodeCamp.org courses and HireWay introductions. "
                "Recorded course metadata was checked on 2026-10-11; "
                "HireWay playback durations were checked on 2026-10-11. "
                "Normal builds verify every entry against YouTube before writing. "
                "Offline builds retain the recorded verification dates."
            ),
            "channels": {
                "freeCodeCamp.org": {
                    "channelId": CHANNEL_ID_FREECODECAMP,
                    "rss": f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID_FREECODECAMP}",
                },
                "HireWay": {"channelId": INTRO_CHANNEL_ID},
            },
            "durationSource": "YouTube ytInitialPlayerResponse.videoDetails.lengthSeconds",
            "verifyCommand": "python3 scripts/data/build_learning_videos.py --check",
        },
        "skills": {name: [video(vid) for vid in vids] for name, vids in SKILLS.items()},
    }
    for name, (video_id, title, seconds) in INTRODUCTIONS.items():
        data["skills"].setdefault(name, []).append({
            "id": video_id,
            "title": title,
            "channel": "HireWay",
            "channelId": INTRO_CHANNEL_ID,
            "durationSeconds": seconds,
            "duration": duration(seconds),
            "verifiedAt": INTRO_VERIFIED_AT,
        })
    return data


def fetch_text(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")


def parse_video_details(page: str, video_id: str) -> dict:
    # Parse the player JSON, not a page-wide regex: microformat.lengthSeconds
    # may be rounded up, and related-video metadata may describe another video.
    match = re.search(r"(?:var\s+)?ytInitialPlayerResponse\s*=\s*", page)
    if not match:
        raise ValueError(f"{video_id}: YouTube player response is missing")
    player, _ = json.JSONDecoder().raw_decode(page[match.end():])
    details = player.get("videoDetails", {})
    if details.get("videoId") != video_id:
        raise ValueError(f"{video_id}: player response describes a different video")
    return details


def verify_video(expected: dict, fetch=fetch_text) -> None:
    video_id = expected["id"]
    watch_url = f"https://www.youtube.com/watch?v={video_id}"
    oembed = json.loads(fetch(f"https://www.youtube.com/oembed?url={watch_url}&format=json"))
    details = parse_video_details(fetch(watch_url), video_id)
    observed = {
        "title": details.get("title"),
        "channel": details.get("author"),
        "channelId": details.get("channelId"),
        "durationSeconds": int(details.get("lengthSeconds", 0)),
    }
    differences = [
        f"{key}: expected {expected[key]!r}, got {value!r}"
        for key, value in observed.items() if expected[key] != value
    ]
    for key, expected_value in [("title", expected["title"]), ("author_name", expected["channel"])]:
        if oembed.get(key) != expected_value:
            differences.append(f"oEmbed {key}: expected {expected_value!r}, got {oembed.get(key)!r}")
    if differences:
        raise ValueError(f"{video_id}: " + "; ".join(differences))


def verify_catalogue(data: dict, verified_at: str, verifier=verify_video) -> dict:
    videos = {item["id"]: item for items in data["skills"].values() for item in items}
    # No file is written or date advanced unless every verification succeeds.
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(verifier, videos.values()))
    verified = deepcopy(data)
    for items in verified["skills"].values():
        for item in items:
            item["verifiedAt"] = verified_at
    verified["meta"]["generated"] = verified_at
    return verified


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--offline", action="store_true", help="Rebuild only the recorded snapshot; do not claim a fresh verification")
    mode.add_argument("--check", action="store_true", help="Verify all metadata online without writing the catalogue")
    parser.add_argument("--verified-at", type=iso_date, default=None, help="Date of this live verification (defaults to current UTC date)")
    args = parser.parse_args()
    if args.offline and args.verified_at:
        parser.error("--verified-at requires live verification")
    data = build_catalogue()
    if not args.offline:
        data = verify_catalogue(data, args.verified_at or datetime.now(timezone.utc).date().isoformat())
    if not args.check:
        OUTPUT_PATH.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8", newline="\n",
        )
    print("verified" if args.check else "wrote", sum(len(v) for v in data["skills"].values()), "videos across", len(data["skills"]), "skills")


if __name__ == "__main__":
    main()
