import os
import tkinter as tk
from tkinter import filedialog, messagebox
try:
    from companion.vibeo_tools import parse_mlt_project
except ImportError:
    from vibeo_tools import parse_mlt_project

def setup_inspector_tab(parent_frame, app):
    """Sets up the Project Inspector tab in the vibeoVideo Command Center."""
    frame = tk.Frame(parent_frame, bg="#0f172a", padx=16, pady=16)
    frame.pack(fill=tk.BOTH, expand=True)

    tk.Label(frame, text="📁 Shotcut Project Inspector (.mlt)", font=("Segoe UI", 13, "bold"), fg="#ffffff", bg="#0f172a").pack(anchor=tk.W)
    tk.Label(frame, text="Inspect active Shotcut project files, track structure, media clips, and auto-evaluate changes.", font=("Segoe UI", 9), fg="#94a3b8", bg="#0f172a").pack(anchor=tk.W, pady=(2, 8))

    row = tk.Frame(frame, bg="#0f172a")
    row.pack(fill=tk.X, pady=6)
    app.mlt_entry = tk.Entry(row, font=("Segoe UI", 10), bg="#1e293b", fg="#ffffff")
    app.mlt_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 8), ipady=4)

    def browse_mlt():
        fn = filedialog.askopenfilename(filetypes=[("Shotcut Project", "*.mlt"), ("All Files", "*.*")])
        if fn:
            app.mlt_entry.delete(0, tk.END)
            app.mlt_entry.insert(0, fn)
            app.set_active_mlt_path(fn)
            analyze_mlt()

    def analyze_mlt():
        p = app.mlt_entry.get().strip()
        if not p or not os.path.exists(p):
            messagebox.showerror("Error", "Please select a valid .mlt Shotcut project file.")
            return
        try:
            app.set_active_mlt_path(p)
            info = parse_mlt_project(p)
            app.mlt_log.delete(1.0, tk.END)
            app.mlt_log.insert(tk.END, f"Project: {os.path.basename(info['file'])}\n")
            app.mlt_log.insert(tk.END, f"Total Media Producers / Clips: {info['producers_count']}\n")
            app.mlt_log.insert(tk.END, f"Tracks: {info.get('tracks_count', 1)} | Filters: {info.get('filters_count', 0)} | Transitions: {info.get('transitions_count', 0)}\n\n")
            app.mlt_log.insert(tk.END, "Media Sources:\n")
            for pr in info['producers']:
                app.mlt_log.insert(tk.END, f" - [{pr['id']}] {pr.get('filename', pr['source'])} (Length: {pr['length']})\n")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to parse MLT: {e}")

    def reevaluate_mlt():
        p = app.mlt_entry.get().strip()
        if p and os.path.exists(p):
            app.set_active_mlt_path(p)
            app.manual_reevaluate_timeline()
            app.notebook.select(app.tab_agent)
        else:
            messagebox.showerror("Error", "Select a valid .mlt file to re-evaluate.")

    app.browse_mlt = browse_mlt
    app.analyze_mlt = analyze_mlt
    app.reevaluate_mlt = reevaluate_mlt

    tk.Button(row, text="Browse .mlt...", font=("Segoe UI", 9, "bold"), command=browse_mlt).pack(side=tk.LEFT)

    btn_bar = tk.Frame(frame, bg="#0f172a")
    btn_bar.pack(fill=tk.X, pady=6)

    tk.Button(btn_bar, text="🔍 Analyze Project", font=("Segoe UI", 9, "bold"), bg="#0284c7", fg="#ffffff", relief=tk.FLAT, pady=6,
              command=analyze_mlt).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 4))

    tk.Button(btn_bar, text="🤖 Re-Evaluate with AI Copilot", font=("Segoe UI", 9, "bold"), bg="#6366f1", fg="#ffffff", relief=tk.FLAT, pady=6,
              command=reevaluate_mlt).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(4, 4))

    tk.Button(btn_bar, text="🖥️ View in Shotcut", font=("Segoe UI", 9, "bold"), bg="#10b981", fg="#ffffff", relief=tk.FLAT, pady=6,
              command=app.view_in_shotcut).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(4, 0))

    watcher_bar = tk.Frame(frame, bg="#1e293b", padx=8, pady=4)
    watcher_bar.pack(fill=tk.X, pady=(0, 6))
    tk.Label(watcher_bar, text="⏱️ Auto-Watcher Active: Automatically detects and AI re-evaluates external edits made in Shotcut.",
             font=("Segoe UI", 8), fg="#93c5fd", bg="#1e293b").pack(side=tk.LEFT)

    app.mlt_log = tk.Text(frame, height=12, bg="#1e293b", fg="#f8fafc", font=("Consolas", 9), relief=tk.FLAT, padx=8, pady=8)
    app.mlt_log.pack(fill=tk.BOTH, expand=True)
