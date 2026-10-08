"""Generate data/learning_videos.json from the verified video metadata.

Original course metadata was verified on 2026-10-04 with the chain recorded
in meta.verifyCommand: oEmbed confirms title and channel; the watch page
lengthSeconds field confirms duration. HireWay introductions were checked
in YouTube Studio and embedded playback on 2026-10-08.
The human-readable duration string is derived here, never typed by hand.
"""
import json

CHANNEL_ID_FREECODECAMP = "UC8butISFwT-Wl7EV0hUK0BQ"
VERIFIED_AT = "2026-10-04"

# (videoId, title, durationSeconds) - all verified against YouTube on
# 2026-10-04 via oEmbed + watch-page lengthSeconds.
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
    "SQL": ("_T15TjsLyoo", "SQL Introduction | HireWay Skills", 91),
    "Thomson Reuters Westlaw": ("reoIUYkbXLo", "Westlaw Legal Research Introduction | HireWay Skills", 92),
    "Intuit QuickBooks": ("PlDo-YoHAVg", "QuickBooks Bookkeeping Introduction | HireWay Skills", 92),
    "Google Analytics": ("wReTbggrUb0", "Google Analytics Marketing Introduction | HireWay Skills", 91),
    "Autodesk AutoCAD": ("kD8UE6zzvGI", "AutoCAD Introduction | HireWay Skills", 91),
}
INTRO_CHANNEL_ID = "UCvp99-loCA8E4xm4LXVP0rg"
INTRO_VERIFIED_AT = "2026-10-08"

data = {
    "meta": {
        "generated": INTRO_VERIFIED_AT,
        "source": (
            "freeCodeCamp.org official channel uploads. Video IDs for the "
            "Kotlin, PostgreSQL (TimescaleDB) and Excel courses were taken "
            "from the channel's key-free RSS feed; older catalogue courses "
            "were confirmed against the same channel. Each original course's title, "
            "channel and duration were re-verified entry by entry with the "
            "command below on 2026-10-04. Five HireWay introductions from the "
            "jayfeather channel were checked in YouTube Studio and embedded "
            "playback on 2026-10-08."
        ),
        "channels": {
            "freeCodeCamp.org": {
                "channelId": CHANNEL_ID_FREECODECAMP,
                "rss": f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID_FREECODECAMP}",
            },
            "jayfeather": {"channelId": INTRO_CHANNEL_ID},
        },
        "verifyCommand": (
            'curl -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={id}&format=json" '
            '&& curl -s "https://www.youtube.com/watch?v={id}" -H "User-Agent: Mozilla/5.0" '
            " | grep -o '\"lengthSeconds\":\"[0-9]*\"'"
        ),
    },
    "skills": {name: [video(vid) for vid in vids] for name, vids in SKILLS.items()},
}

for name, (video_id, title, seconds) in INTRODUCTIONS.items():
    data["skills"].setdefault(name, []).append({
        "id": video_id,
        "title": title,
        "channel": "jayfeather",
        "channelId": INTRO_CHANNEL_ID,
        "durationSeconds": seconds,
        "duration": duration(seconds),
        "verifiedAt": INTRO_VERIFIED_AT,
    })

with open("data/learning_videos.json", "w", encoding="utf-8", newline="\n") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write("\n")

print("wrote", sum(len(v) for v in data["skills"].values()), "videos across", len(data["skills"]), "skills")
