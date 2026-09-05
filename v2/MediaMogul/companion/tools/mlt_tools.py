"""
mlt_tools.py - Shotcut MLT project XML manipulation, transitions, filters, and EDL export.
"""

import os
import time
import shutil
import subprocess
import xml.etree.ElementTree as ET


def tool_add_to_timeline(ffmpeg: str, input_path: str, mlt_path: str = None,
                         in_time: str = "00:00:00", out_time: str = None,
                         output_path: str = None, open_in_shotcut: bool = True) -> str:
    """
    Adds a media file (video, audio, image) directly into a Shotcut .mlt timeline project,
    and optionally launches or opens it in Shotcut Video Editor.
    If mlt_path is not specified or doesn't exist, a new Shotcut project (.mlt) is created.
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Media file not found: {input_path}")

    try:
        from companion.core.ffmpeg_utils import get_media_duration_seconds, find_shotcut_exe
    except Exception:
        try:
            from ..core.ffmpeg_utils import get_media_duration_seconds, find_shotcut_exe
        except Exception:
            from core.ffmpeg_utils import get_media_duration_seconds, find_shotcut_exe

    # Calculate duration
    total_sec = get_media_duration_seconds(ffmpeg, input_path)
    fps = 30
    total_frames = max(1, int(total_sec * fps))

    # Parse in_time and out_time
    def _parse_time_to_seconds(t_val, default=0.0):
        if t_val is None:
            return default
        if isinstance(t_val, (int, float)):
            return float(t_val)
        s = str(t_val).strip()
        parts = s.split(":")
        try:
            if len(parts) == 3:
                return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
            elif len(parts) == 2:
                return float(parts[0]) * 60 + float(parts[1])
            else:
                return float(s)
        except Exception:
            return default

    in_sec = _parse_time_to_seconds(in_time, 0.0)
    out_sec = _parse_time_to_seconds(out_time, total_sec)
    if out_sec <= in_sec:
        out_sec = total_sec

    in_frame = max(0, int(in_sec * fps))
    out_frame = min(total_frames, int(out_sec * fps))

    abs_media = os.path.abspath(input_path).replace("\\", "/")

    if mlt_path and os.path.exists(mlt_path):
        if not output_path:
            output_path = mlt_path
        tree = ET.parse(mlt_path)
        root = tree.getroot()

        existing_producers = root.findall(".//producer")
        new_prod_id = f"producer{len(existing_producers)}"

        prod = ET.Element("producer", {
            "id": new_prod_id,
            "in": "0",
            "out": str(total_frames)
        })
        ET.SubElement(prod, "property", {"name": "resource"}).text = abs_media
        ET.SubElement(prod, "property", {"name": "mlt_service"}).text = "avformat"

        first_playlist = root.find(".//playlist")
        if first_playlist is not None:
            idx = list(root).index(first_playlist)
            root.insert(idx, prod)
        else:
            root.append(prod)

        playlist = root.find(".//playlist")
        if playlist is None:
            playlist = ET.SubElement(root, "playlist", {"id": "playlist0"})
            tractor = root.find(".//tractor")
            if tractor is None:
                tractor = ET.SubElement(root, "tractor", {"id": "tractor0", "title": "Shotcut Timeline"})
                multitrack = ET.SubElement(tractor, "multitrack")
                ET.SubElement(multitrack, "track", {"producer": "playlist0"})

        ET.SubElement(playlist, "entry", {
            "producer": new_prod_id,
            "in": str(in_frame),
            "out": str(out_frame)
        })
        ET.indent(tree, space="  ", level=0)
        tree.write(output_path, encoding="utf-8", xml_declaration=True)
    else:
        if not output_path:
            base, _ = os.path.splitext(input_path)
            output_path = f"{base}_timeline.mlt"

        mlt = ET.Element("mlt", {
            "LC_NUMERIC": "C",
            "version": "7.15.0",
            "title": f"MediaMogul Timeline - {os.path.basename(input_path)}"
        })
        ET.SubElement(mlt, "profile", {
            "description": "HD 1080p 30 fps",
            "width": "1920",
            "height": "1080",
            "progressive": "1",
            "sample_aspect_num": "1",
            "sample_aspect_den": "1",
            "display_aspect_num": "16",
            "display_aspect_den": "9",
            "frame_rate_num": "30",
            "frame_rate_den": "1"
        })
        prod = ET.SubElement(mlt, "producer", {
            "id": "producer0",
            "in": "0",
            "out": str(total_frames)
        })
        ET.SubElement(prod, "property", {"name": "resource"}).text = abs_media
        ET.SubElement(prod, "property", {"name": "mlt_service"}).text = "avformat"

        playlist = ET.SubElement(mlt, "playlist", {"id": "playlist0"})
        ET.SubElement(playlist, "entry", {
            "producer": "producer0",
            "in": str(in_frame),
            "out": str(out_frame)
        })

        tractor = ET.SubElement(mlt, "tractor", {"id": "tractor0", "title": "Shotcut Timeline"})
        multitrack = ET.SubElement(tractor, "multitrack")
        ET.SubElement(multitrack, "track", {"producer": "playlist0"})

        tree = ET.ElementTree(mlt)
        ET.indent(tree, space="  ", level=0)
        tree.write(output_path, encoding="utf-8", xml_declaration=True)

    if open_in_shotcut:
        try:
            sc_exe = find_shotcut_exe()
            if sc_exe and os.path.exists(sc_exe):
                subprocess.Popen([sc_exe, output_path], creationflags=0x00000008 | 0x00000200)
        except Exception:
            pass

    return output_path


def tool_modify_shotcut_mlt(mlt_path: str, filter_type: str, params: dict = None, output_path: str = None) -> str:
    """Inject a filter directly into Shotcut's MLT XML structure."""
    if not os.path.exists(mlt_path):
        raise FileNotFoundError(f"MLT file not found: {mlt_path}")
    if not output_path:
        base, ext = os.path.splitext(mlt_path)
        output_path = f"{base}_mediamogul{ext}"
    params = params or {}
    tree = ET.parse(mlt_path)
    root = tree.getroot()

    tractor = root.find(".//tractor")
    parent = tractor if tractor is not None else root

    filter_elem = ET.SubElement(parent, "filter")
    filter_elem.set("id", f"mediamogul_{filter_type}_{int(time.time())}")

    ET.SubElement(filter_elem, "property", name="mlt_service").text = filter_type
    for k, v in params.items():
        ET.SubElement(filter_elem, "property", name=k).text = str(v)

    tree.write(output_path, encoding="utf-8", xml_declaration=True)
    return output_path


def tool_mlt_add_transition(mlt_path: str, transition_type: str = "luma", duration_frames: int = 30, output_path: str = None) -> str:
    """Add transition into Shotcut .mlt XML."""
    output_path = output_path or f"{os.path.splitext(mlt_path)[0]}_transition.mlt"
    tree = ET.parse(mlt_path)
    root = tree.getroot()
    tractor = root.find(".//tractor")
    parent = tractor if tractor is not None else root
    trans = ET.SubElement(parent, "transition")
    trans.set("id", f"trans_{int(time.time())}")
    ET.SubElement(trans, "property", name="mlt_service").text = transition_type
    ET.SubElement(trans, "property", name="in").text = "0"
    ET.SubElement(trans, "property", name="out").text = str(duration_frames)
    tree.write(output_path, encoding="utf-8", xml_declaration=True)
    return output_path


def tool_mlt_crop_filter(mlt_path: str, top: int = 0, bottom: int = 0, left: int = 0, right: int = 0, output_path: str = None) -> str:
    """Insert crop filter into Shotcut .mlt XML."""
    output_path = output_path or f"{os.path.splitext(mlt_path)[0]}_cropped.mlt"
    tree = ET.parse(mlt_path)
    root = tree.getroot()
    tractor = root.find(".//tractor")
    parent = tractor if tractor is not None else root
    filt = ET.SubElement(parent, "filter")
    filt.set("id", f"crop_{int(time.time())}")
    ET.SubElement(filt, "property", name="mlt_service").text = "crop"
    ET.SubElement(filt, "property", name="top").text = str(top)
    ET.SubElement(filt, "property", name="bottom").text = str(bottom)
    ET.SubElement(filt, "property", name="left").text = str(left)
    ET.SubElement(filt, "property", name="right").text = str(right)
    tree.write(output_path, encoding="utf-8", xml_declaration=True)
    return output_path


def tool_mlt_blur_filter(mlt_path: str, blur_radius: float = 0.2, output_path: str = None) -> str:
    """Add blur filter into Shotcut .mlt XML."""
    output_path = output_path or f"{os.path.splitext(mlt_path)[0]}_blurred.mlt"
    tree = ET.parse(mlt_path)
    root = tree.getroot()
    tractor = root.find(".//tractor")
    parent = tractor if tractor is not None else root
    filt = ET.SubElement(parent, "filter")
    filt.set("id", f"blur_{int(time.time())}")
    ET.SubElement(filt, "property", name="mlt_service").text = "boxblur"
    ET.SubElement(filt, "property", name="radius").text = str(blur_radius)
    tree.write(output_path, encoding="utf-8", xml_declaration=True)
    return output_path


def tool_export_edl(mlt_path: str, output_edl_path: str = None) -> str:
    """Export Edit Decision List (EDL) CMX 3600 from MLT project."""
    output_edl_path = output_edl_path or f"{os.path.splitext(mlt_path)[0]}.edl"
    tree = ET.parse(mlt_path)
    root = tree.getroot()
    edl_lines = ["TITLE: SHOTCUT_PROJECT", "FCM: NON-DROP FRAME\n"]
    idx = 1
    for clip in root.findall(".//producer"):
        src = clip.find("property[@name='resource']")
        if src is not None and src.text:
            fn = os.path.basename(src.text)
            edl_lines.append(f"{idx:03d}  AX       V     C        00:00:00:00 00:00:10:00 00:00:00:00 00:00:10:00")
            edl_lines.append(f"* FROM CLIP NAME: {fn}\n")
            idx += 1
    with open(output_edl_path, "w", encoding="utf-8") as f:
        f.write("\n".join(edl_lines))
    return output_edl_path


def tool_batch_rename(folder_path: str, pattern: str = "{index:03d}_{name}", dry_run: bool = False) -> list:
    """Batch rename files with numbering pattern."""
    files = sorted([f for f in os.listdir(folder_path) if os.path.isfile(os.path.join(folder_path, f))])
    renamed = []
    for idx, fn in enumerate(files, 1):
        b, ext = os.path.splitext(fn)
        new_name = pattern.format(index=idx, name=b) + ext
        old_full = os.path.join(folder_path, fn)
        new_full = os.path.join(folder_path, new_name)
        if not dry_run and old_full != new_full:
            shutil.move(old_full, new_full)
        renamed.append({"old": fn, "new": new_name})
    return renamed


def tool_calculate_stats(ffmpeg: str, video_path: str) -> dict:
    """Calculate duration, dimensions, bitrates, and streams."""
    cmd = [ffmpeg, "-i", video_path]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    stats = {"file": os.path.basename(video_path), "size_mb": round(os.path.getsize(video_path)/(1024*1024), 2)}
    for l in res.stderr.splitlines():
        if "Duration:" in l:
            stats["duration"] = l.split("Duration:")[1].split(",")[0].strip()
            stats["bitrate"] = l.split("bitrate:")[1].strip() if "bitrate:" in l else "unknown"
        elif "Stream #" in l and "Video:" in l:
            stats["video_stream"] = l.split("Video:")[1].strip()
        elif "Stream #" in l and "Audio:" in l:
            stats["audio_stream"] = l.split("Audio:")[1].strip()
    return stats


def parse_mlt_project(mlt_file: str) -> dict:
    """Parse Shotcut .mlt file to inspect tracks, media files, filters, and timeline metadata."""
    if not os.path.exists(mlt_file):
        raise FileNotFoundError(f"Shotcut project file not found: {mlt_file}")

    tree = ET.parse(mlt_file)
    root = tree.getroot()

    producers = []
    for p in root.findall(".//producer"):
        pid = p.attrib.get("id", "")
        res = p.find("property[@name='resource']")
        length = p.find("property[@name='length']")
        service = p.find("property[@name='mlt_service']")
        if res is not None and res.text:
            producers.append({
                "id": pid,
                "source": res.text,
                "filename": os.path.basename(res.text),
                "length": length.text if length is not None else "unknown",
                "service": service.text if service is not None else "avformat"
            })

    # Find filters and transitions
    filters = []
    for f in root.findall(".//filter"):
        fid = f.attrib.get("id", "")
        svc = f.find("property[@name='mlt_service']")
        filters.append({
            "id": fid,
            "service": svc.text if svc is not None else "unknown"
        })

    transitions = []
    for t in root.findall(".//transition"):
        tid = t.attrib.get("id", "")
        svc = t.find("property[@name='mlt_service']")
        transitions.append({
            "id": tid,
            "service": svc.text if svc is not None else "unknown"
        })

    # Track count
    tracks = 0
    multitrack = root.find(".//tractor/multitrack")
    if multitrack is not None:
        tracks = len(multitrack.findall("track"))
    if tracks == 0:
        tracks = len(root.findall(".//playlist"))

    return {
        "file": mlt_file,
        "title": root.attrib.get("title", os.path.basename(mlt_file)),
        "producers_count": len(producers),
        "producers": producers,
        "filters_count": len(filters),
        "filters": filters,
        "transitions_count": len(transitions),
        "transitions": transitions,
        "tracks_count": max(1, tracks),
        "mtime": os.path.getmtime(mlt_file) if os.path.exists(mlt_file) else 0
    }


def tool_evaluate_timeline(mlt_path: str, previous_clip_count: int = None) -> dict:
    """
    Evaluates Shotcut timeline pacing, track balance, audio normalization,
    element overlay density, and generates intelligent editing recommendations.
    """
    info = parse_mlt_project(mlt_path)
    clips = info.get("producers", [])
    filters = info.get("filters", [])
    transitions = info.get("transitions", [])
    num_clips = len(clips)
    num_tracks = info.get("tracks_count", 1)

    filter_services = [f.get("service", "") for f in filters]
    has_subtitles = any(".srt" in c.get("source", "").lower() or "sub" in c.get("id", "").lower() for c in clips)
    has_gain_control = any("volume" in s.lower() or "gain" in s.lower() for s in filter_services)
    has_overlays = any("qtblend" in s.lower() or "element" in c.get("source", "").lower() or "tgs" in c.get("source", "").lower() for c in clips for s in filter_services) or num_tracks > 1
    has_transitions = len(transitions) > 0

    delta = (num_clips - previous_clip_count) if previous_clip_count is not None else 0

    recommendations = []
    if not has_subtitles:
        recommendations.append("🎙️ Generate synchronised subtitles (.srt) with Whisper for increased retention.")
    if not has_gain_control:
        recommendations.append("🔊 Apply audio ducking / gain normalization across voice and background audio.")
    if not has_overlays:
        recommendations.append("✨ Add dynamic Shotcut library elements (stickers, emojis, arrows) to highlight key moments.")
    if not has_transitions and num_clips >= 2:
        recommendations.append("🎬 Insert smooth cross-dissolve/luma transitions at cut boundaries.")
    if num_clips > 4:
        recommendations.append("🌌 Generate 5-Universe Multiverse Timelines for director's, viral, and overlay variants.")

    report = (
        f"📋 Timeline Evaluation for '{os.path.basename(mlt_path)}':\n"
        f"• Total Clips: {num_clips} (delta: {delta:+d})\n"
        f"• Active Tracks: {num_tracks}\n"
        f"• Filters Applied: {len(filters)} ({', '.join(set(filter_services)) if filter_services else 'None'})\n"
        f"• Transitions: {len(transitions)}\n"
        f"• Subtitle Track: {'✓ Detected' if has_subtitles else '✗ Missing'}\n"
        f"• Audio Leveling: {'✓ Active' if has_gain_control else '✗ Needs Gain/Ducking'}\n"
        f"• Elements/Overlays: {'✓ Present' if has_overlays else '✗ None'}\n"
        f"\nRecommended Next Actions:\n" + "\n".join(f"  {r}" for r in recommendations)
    )

    return {
        "file": mlt_path,
        "clip_count": num_clips,
        "delta": delta,
        "track_count": num_tracks,
        "has_subtitles": has_subtitles,
        "has_gain_control": has_gain_control,
        "has_overlays": has_overlays,
        "recommendations": recommendations,
        "report": report
    }
