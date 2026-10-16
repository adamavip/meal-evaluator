# Prompt for ChatGPT: generate the course narration audio

How to use: open a new ChatGPT conversation, attach `docs/audio/narration-script.json`, then paste everything below the line. If ChatGPT cannot produce audio files directly in your session, the prompt tells it to fall back to a ready-to-run script that you execute with an OpenAI API key. Either way, the result is a `audio/` folder that Claude Code will wire into the app.

---

You are producing the voice-over for an online course: **CIMMYT MEAL Framework 2026-2030**, an internal training for staff of CIMMYT (the International Maize and Wheat Improvement Center) on monitoring, evaluation, accountability and learning (MEAL). Most learners are not native English speakers.

I have attached `narration-script.json`. It lists **280 short narration clips** (about 8,300 words) organised by module, lesson and storyboard frame. Each clip has:

- `file`: the exact output path, for example `audio/results-framework/l3-2-f1.mp3`
- `text`: the exact words to speak
- `targetSeconds`: the on-screen time budget for the frame (a guide for pace, not a hard limit)
- `moduleTitle`, `lessonId`, `lessonTitle`, `frame`, `frames`: context only

## What to produce

A directory named `audio/` with **one MP3 per clip, at exactly the path given in `file`**, plus a `manifest.json` at `audio/manifest.json`. Deliver it as a single zip (`audio.zip`).

```
audio/
  manifest.json
  orientation/
    l0-1-f1.mp3
    l0-1-f2.mp3
    ...
  meal-foundations/
    l1-1-f1.mp3
    ...
  theory-of-change/
  results-framework/
  kpis-measurement/
  data-quality/
  evidence-systems/
  impact-assessment/
  learning-adaptation/
  accountability-inclusion/
  implementation-governance/
```

Rules for the files:

1. **Do not rename, merge, split or reorder clips.** One clip per frame, file names exactly as in `file`. The app looks the files up by that path.
2. **Speak the `text` verbatim.** Do not paraphrase, shorten, add greetings, add "frame one", or read file names or lesson titles. Numbers and section references stay as written ("Section 2.7", "142 indicators", "USD 2,400").
3. **MP3, mono, 44.1 kHz, 64 to 96 kbps, peak-normalised to about -1 dBFS, no leading silence longer than 0.2 s, about 0.3 s of trailing silence.** All clips at the same loudness.
4. **One voice for the whole course.** Pick a warm, clear, neutral-accent adult voice, medium pitch, unhurried. Think of a good colleague explaining something, not a news anchor or an advert.
5. **Pace about 140 to 150 words per minute**, with natural pauses at full stops and colons. Where a clip's `text` is clearly longer than `targetSeconds` allows at that pace, keep the natural pace; never rush to fit. I will adjust the on-screen timing from the measured durations.
6. **Pronunciation:** CIMMYT = "SIM-it"; MEAL = the word "meal"; CGIAR = letters "C-G-I-A-R"; KPI, KPIs, QA, RACI, PRMS, KMIT = letters; FAIR = the word "fair"; MEGA = the word "mega"; USD = "U-S-D". Spell out nothing else.
7. Tone: friendly, direct, confident. Questions in the text get a genuine rising question intonation. Short emphatic sentences ("Training is delivered. Adoption is a change.") get a small pause between them.

## manifest.json

A JSON array, one entry per clip, in the same order as the input:

```json
[
  {
    "file": "audio/results-framework/l3-2-f1.mp3",
    "lessonId": "L3.2",
    "frameId": "f1",
    "durationSeconds": 9.84,
    "targetSeconds": 8,
    "words": 24,
    "voice": "<voice name used>",
    "textHash": "<sha1 of the exact text spoken>"
  }
]
```

`durationSeconds` must be the measured duration of the finished file, to two decimals. I will use it to retime the animations, so measure it, do not estimate it.

## How to do it

**If you can synthesise speech and write files in this session**, do it directly, process all 280 clips (check the count at the end), measure durations, write the manifest, zip the folder and give me the download link.

**If you cannot produce audio here**, give me instead:

1. A single Python script `make_audio.py` that reads `narration-script.json` from the same folder, calls the OpenAI text-to-speech API (model `gpt-4o-mini-tts` or `tts-1-hd`, one fixed voice such as `nova`, with the pronunciation and tone instructions above passed as the voice instructions where the model supports them), writes every file to the paths above, skips files that already exist so it can be re-run, retries on rate limits, measures each duration with `mutagen` or `ffprobe`, writes `audio/manifest.json`, and prints a final count. Use only `openai`, `mutagen` and the standard library. Read the API key from the `OPENAI_API_KEY` environment variable.
2. A `requirements.txt`.
3. The exact commands to run it on Windows PowerShell.
4. An estimate of the cost for 8,300 words at the chosen model's price.

Before producing anything, confirm back in two lines: the number of clips you found in the file (it should be 280 across 62 lessons and 11 modules) and the voice you will use. Then proceed without further questions.
