"""
director_tab.py - AI Auto-Director & Viral Shorts Repurposer Studio tab.
"""

import os
import threading
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
try:
    from companion.mediamogul_tools import tool_auto_roughcut, tool_extract_viral_short, find_ffmpeg
except ImportError:
    from mediamogul_tools import tool_auto_roughcut, tool_extract_viral_short, find_ffmpeg


def setup_director_tab(parent_frame, app):
    """Sets up the AI Auto-Director & Viral Shorts Repurposer tab."""
    frame = tk.Frame(parent_frame, bg="#0f172a", padx=16, pady=14)
    frame.pack(fill=tk.BOTH, expand=True)

    # Header
    tk.Label(frame, text="🎬 AI Auto-Director & Viral Shorts Repurposer", font=("Segoe UI", 14, "bold"), fg="#ffffff", bg="#0f172a").pack(anchor=tk.W)
    tk.Label(frame, text="One-click intelligent editing: remove all dead-air pauses to generate a Shotcut .mlt timeline, or extract viral vertical shorts.", font=("Segoe UI", 8), fg="#94a3b8", bg="#0f172a").pack(anchor=tk.W, pady=(2, 10))

    # Two Studio Cards
    cards_box = tk.Frame(frame, bg="#0f172a")
    cards_box.pack(fill=tk.BOTH, expand=True)

    # ==========================================
    # CARD 1: ONE-CLICK MAGIC ROUGHCUT
    # ==========================================
    c1 = tk.Frame(cards_box, bg="#1e293b", padx=12, pady=12, relief=tk.GROOVE, bd=1)
    c1.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 8))

    tk.Label(c1, text="⚡ 1-Click Magic Roughcut", font=("Segoe UI", 11, "bold"), fg="#38bdf8", bg="#1e293b").pack(anchor=tk.W)
    tk.Label(c1, text="Scans raw footage, detects all silent pauses/dead-air, and automatically generates an instant Shotcut .mlt timeline project ready to open!", font=("Segoe UI", 8), fg="#cbd5e1", bg="#1e293b", wraplength=310, justify=tk.LEFT).pack(anchor=tk.W, pady=(4, 8))

    tk.Label(c1, text="Source Video Clip:", font=("Segoe UI", 9, "bold"), fg="#ffffff", bg="#1e293b").pack(anchor=tk.W)
    r1 = tk.Frame(c1, bg="#1e293b")
    r1.pack(fill=tk.X, pady=(2, 6))

    app.roughcut_entry = tk.Entry(r1, font=("Segoe UI", 9), bg="#0f172a", fg="#ffffff")
    app.roughcut_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6), ipady=2)

    def browse_roughcut_video():
        fn = filedialog.askopenfilename(filetypes=[("Video Files", "*.mp4 *.mov *.mkv *.avi *.webm")])
        if fn:
            app.roughcut_entry.delete(0, tk.END)
            app.roughcut_entry.insert(0, fn)

    tk.Button(r1, text="Browse...", font=("Segoe UI", 8, "bold"), command=browse_roughcut_video).pack(side=tk.LEFT)

    r_settings = tk.Frame(c1, bg="#1e293b")
    r_settings.pack(fill=tk.X, pady=(0, 8))

    tk.Label(r_settings, text="Min Silence (s):", font=("Segoe UI", 8), fg="#94a3b8", bg="#1e293b").pack(side=tk.LEFT, padx=(0, 4))
    app.silence_dur_entry = tk.Entry(r_settings, width=6, font=("Segoe UI", 9))
    app.silence_dur_entry.insert(0, "0.5")
    app.silence_dur_entry.pack(side=tk.LEFT, padx=(0, 10))

    tk.Label(r_settings, text="Noise Threshold:", font=("Segoe UI", 8), fg="#94a3b8", bg="#1e293b").pack(side=tk.LEFT, padx=(0, 4))
    app.noise_db_combo = ttk.Combobox(r_settings, values=["-25 dB (Strict)", "-30 dB (Default)", "-35 dB (Quiet)"], width=16, state="readonly")
    app.noise_db_combo.set("-30 dB (Default)")
    app.noise_db_combo.pack(side=tk.LEFT)

    def run_auto_roughcut():
        vid = app.roughcut_entry.get().strip()
        if not vid or not os.path.exists(vid):
            messagebox.showerror("File Error", "Please select a valid raw video file.")
            return

        db_str = app.noise_db_combo.get().split()[0]
        db = float(db_str)
        dur = float(app.silence_dur_entry.get().strip() or "0.5")
        ffmpeg = app.ffmpeg_path or find_ffmpeg()

        app.status_var.set("Analyzing audio silence and building Shotcut MLT timeline...")
        app.director_log.delete(1.0, tk.END)
        app.director_log.insert(tk.END, f"Scanning {os.path.basename(vid)} for speech cuts...\n")

        def _do():
            try:
                res = tool_auto_roughcut(ffmpeg, vid, noise_tolerance_db=db, min_silence_sec=dur)
                mlt_path = res["mlt_project"]
                if app.media_tracker:
                    app.media_tracker.track_file(mlt_path, role="roughcut_mlt")

                app.root.after(0, lambda: app.director_log.insert(
                    tk.END,
                    f"✨ Roughcut Shotcut Project Generated!\n"
                    f"----------------------------------------\n"
                    f"📁 Project: {os.path.basename(mlt_path)}\n"
                    f"🎬 Total Clean Clips: {res['clips_count']}\n"
                    f"🔇 Pauses Removed: {res['silences_removed']} ({res['seconds_saved']}s dead air eliminated)\n"
                    f"⏱️ Length: {res['original_duration_sec']}s -> {res['roughcut_duration_sec']}s\n\n"
                    f"Open this .mlt file in Shotcut to continue editing instantly!\n"
                ))
                app.status_var.set("Magic Roughcut completed successfully!")
                messagebox.showinfo("Success", f"Shotcut Roughcut Timeline Created:\n{mlt_path}\n\nOpen with Shotcut to view all clips!")
            except Exception as e:
                app.root.after(0, lambda: app.director_log.insert(tk.END, f"\nError: {e}\n"))
                messagebox.showerror("Roughcut Error", str(e))

        threading.Thread(target=_do, daemon=True).start()

    tk.Button(c1, text="🚀 Build Shotcut Project (.mlt)", font=("Segoe UI", 10, "bold"), bg="#0284c7", fg="#ffffff", relief=tk.FLAT, pady=6, command=run_auto_roughcut).pack(fill=tk.X, pady=(4, 8))

    # ==========================================
    # CARD 2: VIRAL SHORTS REPURPOSER
    # ==========================================
    c2 = tk.Frame(cards_box, bg="#1e293b", padx=12, pady=12, relief=tk.GROOVE, bd=1)
    c2.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

    tk.Label(c2, text="📱 Viral Shorts / TikTok Extractor", font=("Segoe UI", 11, "bold"), fg="#f472b6", bg="#1e293b").pack(anchor=tk.W)
    tk.Label(c2, text="Pinpoints the most engaging 30-45s highlight from long footage, cuts it, converts to 9:16 vertical, and auto-burns styled subtitles!", font=("Segoe UI", 8), fg="#cbd5e1", bg="#1e293b", wraplength=310, justify=tk.LEFT).pack(anchor=tk.W, pady=(4, 8))

    tk.Label(c2, text="Long Horizontal Video:", font=("Segoe UI", 9, "bold"), fg="#ffffff", bg="#1e293b").pack(anchor=tk.W)
    r2 = tk.Frame(c2, bg="#1e293b")
    r2.pack(fill=tk.X, pady=(2, 6))

    app.viral_entry = tk.Entry(r2, font=("Segoe UI", 9), bg="#0f172a", fg="#ffffff")
    app.viral_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6), ipady=2)

    def browse_viral_video():
        fn = filedialog.askopenfilename(filetypes=[("Video Files", "*.mp4 *.mov *.mkv *.avi *.webm")])
        if fn:
            app.viral_entry.delete(0, tk.END)
            app.viral_entry.insert(0, fn)

    tk.Button(r2, text="Browse...", font=("Segoe UI", 8, "bold"), command=browse_viral_video).pack(side=tk.LEFT)

    r_opts = tk.Frame(c2, bg="#1e293b")
    r_opts.pack(fill=tk.X, pady=(0, 8))

    tk.Label(r_opts, text="Target Duration:", font=("Segoe UI", 8), fg="#94a3b8", bg="#1e293b").pack(side=tk.LEFT, padx=(0, 4))
    app.viral_dur_combo = ttk.Combobox(r_opts, values=["30 Seconds (Quick Hook)", "45 Seconds (Standard)", "60 Seconds (Full Story)"], width=22, state="readonly")
    app.viral_dur_combo.set("30 Seconds (Quick Hook)")
    app.viral_dur_combo.pack(side=tk.LEFT)

    def run_viral_extractor():
        key = app.settings.get("api_key", "").strip()
        if not key:
            messagebox.showerror("Key Required", "Enter your OpenAI API key in Settings.")
            app.notebook.select(app.tab_settings)
            return

        vid = app.viral_entry.get().strip()
        if not vid or not os.path.exists(vid):
            messagebox.showerror("File Error", "Please select a valid long video file.")
            return

        dur_text = app.viral_dur_combo.get().split()[0]
        dur_sec = int(dur_text)
        ffmpeg = app.ffmpeg_path or find_ffmpeg()

        app.status_var.set("Transcribing and evaluating viral moments with AI...")
        app.director_log.delete(1.0, tk.END)
        app.director_log.insert(tk.END, f"Transcribing dialogue and hunting viral hooks in {os.path.basename(vid)}...\n")

        def _do():
            try:
                out = tool_extract_viral_short(ffmpeg, vid, key, target_duration_sec=dur_sec)
                if app.media_tracker:
                    app.media_tracker.track_file(out, role="viral_short_9x16")

                app.root.after(0, lambda: app.director_log.insert(
                    tk.END,
                    f"🔥 Viral 9:16 Short Ready to Publish!\n"
                    f"----------------------------------------\n"
                    f"📱 Output File: {out}\n"
                    f"🎯 Format: 9:16 Vertical with Blurred Background & Burned Subtitles\n\n"
                    f"Drag straight onto TikTok, YouTube Shorts, or Instagram Reels!\n"
                ))
                app.status_var.set("Viral Short successfully extracted!")
                messagebox.showinfo("Success", f"Viral Vertical Short Generated:\n{out}")
            except Exception as e:
                app.root.after(0, lambda: app.director_log.insert(tk.END, f"\nError: {e}\n"))
                messagebox.showerror("Extraction Error", str(e))

        threading.Thread(target=_do, daemon=True).start()

    tk.Button(c2, text="🔥 Repurpose into 9:16 Short", font=("Segoe UI", 10, "bold"), bg="#db2777", fg="#ffffff", relief=tk.FLAT, pady=6, command=run_viral_extractor).pack(fill=tk.X, pady=(4, 8))

    # Log & Results box
    app.director_log = tk.Text(frame, height=5, bg="#1e293b", fg="#f8fafc", font=("Consolas", 9), relief=tk.FLAT, padx=8, pady=8)
    app.director_log.pack(fill=tk.X, pady=(10, 0))
    app.director_log.insert(tk.END, "AI Auto-Director ready. Choose '1-Click Magic Roughcut' or 'Viral Shorts Extractor'.\n")
