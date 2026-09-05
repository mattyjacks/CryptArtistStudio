"""
broll_tab.py - Visual B-Roll Studio tab for OpenAI DALL-E 3 image generation.
"""

import os
import threading
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
try:
    from companion.vibeo_tools import generate_dalle_image
except ImportError:
    from vibeo_tools import generate_dalle_image


def setup_broll_tab(parent_frame, app):
    frame = tk.Frame(parent_frame, bg="#0f172a", padx=16, pady=16)
    frame.pack(fill=tk.BOTH, expand=True)

    tk.Label(frame, text="🎨 DALL-E 3 Visual B-Roll Studio", font=("Segoe UI", 13, "bold"), fg="#ffffff", bg="#0f172a").pack(anchor=tk.W)
    tk.Label(frame, text="Generate custom 16:9 widescreen or 9:16 vertical AI imagery for your project.", font=("Segoe UI", 9), fg="#94a3b8", bg="#0f172a").pack(anchor=tk.W, pady=(2, 8))

    tk.Label(frame, text="Image Prompt:", font=("Segoe UI", 9, "bold"), fg="#ffffff", bg="#0f172a").pack(anchor=tk.W)
    app.broll_prompt = tk.Entry(frame, font=("Segoe UI", 10), bg="#1e293b", fg="#ffffff")
    app.broll_prompt.pack(fill=tk.X, pady=4, ipady=4)
    app.broll_prompt.insert(0, "Cinematic 35mm anamorphic shot of futuristic cyberpunk Tokyo in neon rain, photorealistic 8k")

    ctrl = tk.Frame(frame, bg="#0f172a")
    ctrl.pack(fill=tk.X, pady=6)

    tk.Label(ctrl, text="Ratio:", font=("Segoe UI", 9, "bold"), fg="#ffffff", bg="#0f172a").pack(side=tk.LEFT, padx=4)
    app.broll_ratio = ttk.Combobox(ctrl, values=["1792x1024 (16:9 Video)", "1024x1024 (1:1 Square)", "1024x1792 (9:16 Shorts)"], state="readonly", width=22)
    app.broll_ratio.set("1792x1024 (16:9 Video)")
    app.broll_ratio.pack(side=tk.LEFT, padx=6)

    def run_broll_tab():
        key = app.settings.get("api_key", "").strip()
        if not key:
            messagebox.showerror("Key Required", "Enter your OpenAI API key in Settings.")
            return
        prompt = app.broll_prompt.get().strip()
        if not prompt:
            messagebox.showerror("Empty Prompt", "Please enter an image prompt.")
            return

        out_path = filedialog.asksaveasfilename(defaultextension=".png", filetypes=[("PNG Image", "*.png")], initialfile="vibeo_broll.png")
        if not out_path:
            return

        raw_ratio = app.broll_ratio.get().split()[0]
        app.status_var.set("Generating DALL-E 3 visual (~20s)...")
        app.broll_status.config(text="Generating image with DALL-E 3... please wait.")

        def _do():
            try:
                img_url = generate_dalle_image(prompt, out_path, key, raw_ratio)
                app.broll_status.config(text=f"✓ Saved image: {os.path.basename(out_path)}")
                app.status_var.set(f"Image saved to: {out_path}")
                if hasattr(app, "media_tracker") and app.media_tracker:
                    app.media_tracker.track_file(out_path, role="broll_image")
                messagebox.showinfo("Success", f"DALL-E 3 image saved:\n{out_path}\n\nYou can now drag this image straight onto the Shotcut timeline!")
            except Exception as e:
                app.broll_status.config(text=f"✗ Error: {e}")
                app.status_var.set("DALL-E generation failed.")
                messagebox.showerror("DALL-E Error", str(e))

        threading.Thread(target=_do, daemon=True).start()

    tk.Button(frame, text="🎨 Render & Download B-Roll Image", font=("Segoe UI", 10, "bold"), bg="#a855f7", fg="#ffffff", relief=tk.FLAT, pady=8,
              command=run_broll_tab).pack(fill=tk.X, pady=10)

    app.broll_status = tk.Label(frame, text="", font=("Segoe UI", 9), fg="#34d399", bg="#0f172a")
    app.broll_status.pack(pady=4)
