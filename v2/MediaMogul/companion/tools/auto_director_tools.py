"""
auto_director_tools.py - Autonomous AI Video Timeline Auto-Director & Viral Shorts Repurposer.
1. "One-Click Magic Roughcut": Scans raw takes, detects silent dead-air pauses, and outputs a ready-to-open Shotcut .mlt project.
2. "Viral Short Repurposer": Uses LLM intelligence to pinpoint the highest-retention segment of long footage,
   cuts it, converts it to 9:16 vertical, and burns styled captions.
"""

import os
import json
import subprocess
import xml.etree.ElementTree as ET
try:
    from companion.tools.audio_tools import tool_detect_silence, tool_normalize_loudness
    from companion.tools.video_edit_tools import tool_trim_video, tool_convert_vertical
    from companion.tools.subtitles_tools import extract_audio_for_whisper, transcribe_whisper, convert_whisper_to_srt, tool_burn_subtitles
    from companion.core.ffmpeg_utils import find_ffmpeg, format_timestamp, get_media_duration_seconds
except ImportError:
    try:
        from .audio_tools import tool_detect_silence, tool_normalize_loudness
        from .video_edit_tools import tool_trim_video, tool_convert_vertical
        from .subtitles_tools import extract_audio_for_whisper, transcribe_whisper, convert_whisper_to_srt, tool_burn_subtitles
        from ..core.ffmpeg_utils import find_ffmpeg, format_timestamp, get_media_duration_seconds
    except ImportError:
        from tools.audio_tools import tool_detect_silence, tool_normalize_loudness
        from tools.video_edit_tools import tool_trim_video, tool_convert_vertical
        from tools.subtitles_tools import extract_audio_for_whisper, transcribe_whisper, convert_whisper_to_srt, tool_burn_subtitles
        from core.ffmpeg_utils import find_ffmpeg, format_timestamp, get_media_duration_seconds


def _get_video_duration_seconds(ffmpeg: str, video_path: str) -> float:
    """Probes media duration in seconds via FFprobe/FFmpeg."""
    return get_media_duration_seconds(ffmpeg, video_path)


def tool_auto_roughcut(ffmpeg: str, input_video: str, noise_tolerance_db: float = -30.0,
                       min_silence_sec: float = 0.5, output_mlt: str = None) -> dict:
    """
    Analyzes raw footage, identifies all spoken content, removes silent pauses,
    and builds an instant Shotcut .mlt timeline project with cleanly cut clips.
    """
    if not os.path.exists(input_video):
        raise FileNotFoundError(f"Input video not found: {input_video}")

    if not output_mlt:
        base, _ = os.path.splitext(input_video)
        output_mlt = f"{base}_mediamogul_roughcut.mlt"

    total_duration = _get_video_duration_seconds(ffmpeg, input_video)
    silences = tool_detect_silence(ffmpeg, input_video, noise_tolerance_db, min_silence_sec)

    # Invert silence intervals into active speech segments
    speech_segments = []
    current_pos = 0.0
    padding = 0.08  # 80ms breathing room around cuts

    for sil in silences:
        sil_start = max(0.0, sil["start"] - padding)
        sil_end = min(total_duration, sil["end"] + padding)

        if sil_start > current_pos + 0.2:
            speech_segments.append({"in": current_pos, "out": sil_start, "duration": sil_start - current_pos})
        current_pos = max(current_pos, sil_end)

    if current_pos < total_duration - 0.2:
        speech_segments.append({"in": current_pos, "out": total_duration, "duration": total_duration - current_pos})

    if not speech_segments:
        # No silences or full speech
        speech_segments = [{"in": 0.0, "out": total_duration, "duration": total_duration}]

    # Build standard Shotcut MLT project XML
    fps = 30
    total_frames = int(total_duration * fps)

    mlt = ET.Element("mlt", {
        "LC_NUMERIC": "C",
        "version": "7.15.0",
        "title": f"MediaMogul Auto-Roughcut - {os.path.basename(input_video)}"
    })

    # Profile: 1080p 30fps
    profile = ET.SubElement(mlt, "profile", {
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

    # Master Producer for input video
    prod = ET.SubElement(mlt, "producer", {
        "id": "producer0",
        "in": "0",
        "out": str(total_frames)
    })
    ET.SubElement(prod, "property", {"name": "resource"}).text = os.path.abspath(input_video).replace("\\", "/")
    ET.SubElement(prod, "property", {"name": "mlt_service"}).text = "avformat"

    # Playlist assembling all speech clips sequentially
    playlist = ET.SubElement(mlt, "playlist", {"id": "playlist0"})
    for seg in speech_segments:
        in_frame = int(seg["in"] * fps)
        out_frame = int(seg["out"] * fps)
        ET.SubElement(playlist, "entry", {
            "producer": "producer0",
            "in": str(in_frame),
            "out": str(out_frame)
        })

    # Main Tractor with track
    tractor = ET.SubElement(mlt, "tractor", {"id": "tractor0", "title": "Shotcut Timeline"})
    multitrack = ET.SubElement(tractor, "multitrack")
    ET.SubElement(multitrack, "track", {"producer": "playlist0"})

    # Write out .mlt XML file
    tree = ET.ElementTree(mlt)
    ET.indent(tree, space="  ", level=0)
    tree.write(output_mlt, encoding="utf-8", xml_declaration=True)

    time_saved = sum(s["duration"] for s in silences)
    roughcut_dur = sum(seg["duration"] for seg in speech_segments)

    return {
        "mlt_project": output_mlt,
        "clips_count": len(speech_segments),
        "silences_removed": len(silences),
        "seconds_saved": round(time_saved, 2),
        "original_duration_sec": round(total_duration, 2),
        "roughcut_duration_sec": round(roughcut_dur, 2)
    }


def tool_extract_viral_short(ffmpeg: str, input_video: str, api_key: str,
                             target_duration_sec: int = 35, output_path: str = None) -> str:
    """
    Transcribes video with Whisper, has OpenAI locate the most viral narrative hook,
    cuts the segment, converts to 9:16 vertical, and burns on-screen subtitles.
    """
    if not os.path.exists(input_video):
        raise FileNotFoundError(f"Input video not found: {input_video}")

    base, ext = os.path.splitext(input_video)
    if not output_path:
        output_path = f"{base}_viral_short_9x16.mp4"

    # 1. Transcribe audio to get timestamped segments
    temp_audio = f"{base}_temp_probe.mp3"
    extract_audio_for_whisper(input_video, temp_audio, ffmpeg)

    whisper_data = transcribe_whisper(temp_audio, api_key)
    if os.path.exists(temp_audio):
        os.remove(temp_audio)

    segments = whisper_data.get("segments", [])
    if not segments:
        raise RuntimeError("No spoken dialogue found in the video to analyze for viral clips.")

    # 2. Ask GPT to find the best 30-60s window
    import urllib.request
    segments_summary = []
    for s in segments[:60]:  # limit to first 60 segments for prompt efficiency
        segments_summary.append({
            "start": round(s.get("start", 0.0), 1),
            "end": round(s.get("end", 0.0), 1),
            "text": s.get("text", "").strip()
        })

    prompt_payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a viral TikTok and YouTube Shorts retention strategist. "
                    "Analyze timestamped transcript segments and select the SINGLE most exciting, "
                    f"insightful, or funny ~{target_duration_sec}-second continuous window. "
                    "Output ONLY a JSON block:\n"
                    '{"start_time": "00:00:15.000", "end_time": "00:00:48.000", "hook_reason": "..."}'
                )
            },
            {
                "role": "user",
                "content": f"Transcript segments:\n{json.dumps(segments_summary, indent=1)}"
            }
        ],
        "temperature": 0.3
    }

    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(prompt_payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        gpt_res = json.loads(resp.read().decode("utf-8"))
        ans = gpt_res["choices"][0]["message"]["content"].strip()

    # Parse timestamps
    import re
    m = re.search(r'\{[\s\S]*?"start_time"[\s\S]*?\}', ans)
    start_ts = "00:00:00"
    end_ts = "00:00:30"
    if m:
        try:
            choice = json.loads(m.group(0))
            start_ts = choice.get("start_time", start_ts)
            end_ts = choice.get("end_time", end_ts)
        except Exception:
            pass

    # 3. Trim the chosen hook
    trimmed_clip = f"{base}_hook_trimmed{ext}"
    tool_trim_video(ffmpeg, input_video, start_ts, end_ts, trimmed_clip)

    # 4. Convert to 9:16 vertical video with blurred background
    vertical_clip = f"{base}_hook_vertical{ext}"
    tool_convert_vertical(ffmpeg, trimmed_clip, blur_background=True, output_path=vertical_clip)

    # 5. Extract SRT for trimmed portion & burn on-screen subtitles
    srt_path = f"{base}_hook.srt"
    convert_whisper_to_srt(whisper_data, srt_path)

    tool_burn_subtitles(ffmpeg, vertical_clip, srt_path, output_path)

    # Clean intermediate files
    for tmp in (trimmed_clip, vertical_clip, srt_path):
        if os.path.exists(tmp):
            try:
                os.remove(tmp)
            except Exception:
                pass

    return output_path
