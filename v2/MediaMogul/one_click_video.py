# -*- coding: utf-8 -*-
"""
one_click_video.py - Instant One-Click Video Production for MediaMogul Shotcut.

Click one button or run this script to:
1. Ingest camera takes & voiceovers (100% Fingerprint-Free)
2. Master audio to broadcast -14 LUFS standard
3. Assemble multitrack Shotcut .mlt timeline XML
4. Render 1080p master MP4 with melt.exe
5. Run Computer Vision Quality Gate frame audit
6. Launch Shotcut with master video loaded on desktop
"""

import os
import sys
import time
from pathlib import Path

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Add companion and root to sys.path
root_dir = Path(__file__).resolve().parent
companion_dir = root_dir / "companion"
for p in [str(root_dir), str(companion_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from companion.core.autonomous_agent import AutonomousVideoAgent


def produce_one_click_video(folder_path: str = None) -> dict:
    target = folder_path
    if not target:
        if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
            target = sys.argv[1]
        else:
            default_test = r"C:\Users\ventu\Videos\drive-download-20260906T004623Z-1-001"
            if os.path.exists(default_test):
                target = default_test
            else:
                import tkinter as tk
                from tkinter import filedialog
                root = tk.Tk()
                root.withdraw()
                target = filedialog.askdirectory(title="Select Media Folder for 1-Click Video")
                root.destroy()

    if not target or not os.path.exists(target):
        print(f"[ERROR] Valid media folder required. Given: '{target}'")
        return {"status": "FAILED", "error": "Folder not found"}

    print("═" * 70)
    print("⚡ MEDIAMOGUL: ONE-CLICK AUTONOMOUS VIDEO PRODUCTION")
    print(f"📁 Target Media: {target}")
    print("🛡️ Authenticity: 🟢 100% Fingerprint-Free")
    print("═" * 70)

    agent = AutonomousVideoAgent()
    goal = "One-Click Video Production: Ingest, Master -14 LUFS, Build MLT, Melt Render, Vision QC, and Open in Shotcut."
    res = agent.execute_goal(goal, target)

    if res.get("status") == "SUCCESS":
        print("\n" + "═" * 70)
        print("🎉 SUCCESS! Video Ready:")
        print(f"🎥 Master Video: {res.get('output_video')}")
        print(f"📁 MLT Timeline: {res.get('output_mlt')}")
        print("═" * 70)
    else:
        print(f"\n❌ Production Failed: {res.get('error')}")

    return res


if __name__ == "__main__":
    produce_one_click_video()
