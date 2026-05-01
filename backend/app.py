from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import torch
import pathlib
import tempfile
import torchaudio
import torch.nn.functional as F
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)





app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



from speechbrain.inference.separation import SepformerSeparation
import torch.serialization as serialization

serialization.add_safe_globals([SepformerSeparation])


def load_local_model():
    model_path = os.path.join(os.path.dirname(__file__), "model.pth")
    original_posix_path = pathlib.PosixPath

    if os.name == "nt":
        pathlib.PosixPath = pathlib.WindowsPath

    try:
        return torch.load(model_path, map_location="cpu", weights_only=False)
    finally:
        if os.name == "nt":
            pathlib.PosixPath = original_posix_path


model = load_local_model()

# Ensure the loaded SpeechBrain model runs on CPU even if it was trained/configured for CUDA.
try:
    cpu_device = torch.device("cpu")
    # Try the simple API first
    try:
        model.to(cpu_device)
    except Exception:
        pass

    # Set device attribute expected by SpeechBrain inference helpers
    try:
        setattr(model, "device", cpu_device)
    except Exception:
        pass

    # Move submodules to CPU (mods may contain encoder/masknet/decoder)
    if hasattr(model, "mods"):
        for attr in dir(model.mods):
            sub = getattr(model.mods, attr)
            try:
                if isinstance(sub, torch.nn.Module):
                    sub.to(cpu_device)
            except Exception:
                continue
except Exception as _err:
    logger.warning(f"Could not force model to CPU cleanly: {_err}")

@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": model is not None}

def analyze_waveform(waveform, sample_rate):
    if waveform.dim() > 1:
        waveform = waveform.mean(dim=0)

    waveform = waveform.float()
    waveform = waveform - waveform.mean()

    duration_seconds = waveform.numel() / float(sample_rate)

    # A 6-second clip is often too short to estimate breathing rate reliably.
    # Return uncertainty instead of turning noise into a false abnormal alarm.
    if duration_seconds < 12.0 or waveform.numel() < sample_rate:
        return {
            "respiratory_rate": None,
            "breathing_pattern": "insufficient_signal",
            "condition": "unable_to_assess",
            "severity_score": 0.0,
            "confidence": 0,
        }

    # Low-pass filter to remove high-frequency noise (breathing is ~0.2-0.3 Hz)
    # Apply multiple rounds of smoothing
    smooth_window = max(200, sample_rate // 8)  # ~125ms window for 8kHz
    smoothed = F.avg_pool1d(
        waveform.abs().view(1, 1, -1),
        kernel_size=smooth_window,
        stride=1,
        padding=smooth_window // 2,
    ).view(-1)

    # Apply additional smoothing to further reduce noise
    smoothed = F.avg_pool1d(
        smoothed.view(1, 1, -1),
        kernel_size=smooth_window // 2,
        stride=1,
        padding=smooth_window // 4,
    ).view(-1)

    # More conservative threshold (1.5x std instead of 0.35x)
    threshold = smoothed.mean() + (1.5 * smoothed.std())
    
    # Find peaks with minimum distance constraint (enforce spacing between breaths)
    # Normal breathing: 12-20 bpm = 0.2-0.33 Hz = 1 peak every 3-5 seconds
    # At 8kHz, that's 1 peak every 24k-40k samples
    min_distance = max(int(sample_rate * 2.5), 1000)  # At least 2.5 seconds between peaks
    
    if smoothed.numel() < 3:
        peaks = torch.empty(0, dtype=torch.long)
    else:
        # Find local maxima
        is_peak = ((smoothed[1:-1] > smoothed[:-2]) & (smoothed[1:-1] >= smoothed[2:]) & (smoothed[1:-1] > threshold))
        peak_indices = is_peak.nonzero(as_tuple=False).flatten() + 1
        
        # Filter peaks by minimum distance
        if peak_indices.numel() > 0:
            filtered_peaks = [peak_indices[0].item()]
            for peak_idx in peak_indices[1:]:
                if peak_idx.item() - filtered_peaks[-1] >= min_distance:
                    filtered_peaks.append(peak_idx.item())
            peaks = torch.tensor(filtered_peaks, dtype=torch.long)
        else:
            peaks = torch.empty(0, dtype=torch.long)

    if peaks.numel() < 2:
        return {
            "respiratory_rate": None,
            "breathing_pattern": "insufficient_signal",
            "condition": "unable_to_assess",
            "severity_score": 0.0,
            "confidence": 0,
        }

    peak_gaps = torch.diff(peaks).float() / float(sample_rate)
    median_gap_seconds = float(torch.median(peak_gaps)) if peak_gaps.numel() > 0 else 0.0

    # Breathing usually repeats every 3-5 seconds. If the spacing is far outside
    # that range, the signal is probably noisy or not respiratory.
    if median_gap_seconds < 2.0 or median_gap_seconds > 8.0:
        return {
            "respiratory_rate": None,
            "breathing_pattern": "uncertain",
            "condition": "unable_to_assess",
            "severity_score": 0.0,
            "confidence": 0,
        }

    duration_minutes = waveform.numel() / float(sample_rate) / 60.0
    respiratory_rate = None
    if duration_minutes > 0 and peaks.numel() > 0:
        respiratory_rate = round(float(peaks.numel() / duration_minutes), 1)

    if respiratory_rate is None:
        breathing_pattern = "uncertain"
        condition = "unable_to_assess"
        severity_score = 0.0
        confidence = 0
    else:
        # Normal range: 12-20 bpm; Alert if <10 or >25 bpm
        is_normal = 12 <= respiratory_rate <= 20
        is_alert = (respiratory_rate < 10 or respiratory_rate > 25)
        breathing_pattern = "regular" if is_normal else "irregular"
        condition = "normal" if is_normal else ("alert" if is_alert else "abnormal")
        # Severity: how far from ideal 16 bpm
        severity_score = round(min(1.0, abs(respiratory_rate - 16.0) / 12.0), 2)
        confidence = int(max(50, min(95, 100 - (severity_score * 40))))

    return {
        "respiratory_rate": respiratory_rate,
        "breathing_pattern": breathing_pattern,
        "condition": condition,
        "severity_score": severity_score,
        "confidence": confidence,
    }

@app.post("/analyze")
async def analyze(file: UploadFile = File(...), bed_id: str | None = Form(default=None)):
    logger.info(f"Received upload: {file.filename}, content_type: {file.content_type}, bed_id: {bed_id}")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        content = await file.read()
        tmp.write(content)
        audio_path = tmp.name
    
    logger.info(f"Saved audio to {audio_path}, file size: {os.path.getsize(audio_path)} bytes")

    try:
        waveform, sample_rate = torchaudio.load(audio_path)
        logger.info(f"Loaded audio: shape={tuple(waveform.shape)}, sample_rate={sample_rate}")
        
        if waveform.dim() > 1:
            waveform = waveform.mean(dim=0, keepdim=True)
        else:
            waveform = waveform.unsqueeze(0)

        model_sample_rate = getattr(model.hparams, "sample_rate", sample_rate)
        if sample_rate != model_sample_rate:
            logger.info(f"Resampling audio from {sample_rate} Hz to {model_sample_rate} Hz")
            waveform = torchaudio.transforms.Resample(
                orig_freq=sample_rate,
                new_freq=model_sample_rate,
            )(waveform)

        logger.info(f"Running model.separate_batch on waveform with shape {tuple(waveform.shape)}")
        separated = model.separate_batch(waveform)
        logger.info(f"Separation complete, output type: {type(separated)}, shape: {separated.shape if isinstance(separated, torch.Tensor) else 'unknown'}")
        if isinstance(separated, torch.Tensor):
            logger.info(f"Separated output stats - min: {separated.min():.4f}, max: {separated.max():.4f}, mean: {separated.mean():.4f}")

        if isinstance(separated, torch.Tensor):
            logger.info(f"Separated tensor shape: {separated.shape}, dims: {separated.dim()}")
            source_count = int(separated.shape[-1]) if separated.dim() >= 3 else 1
            # Extract the first separated source (typically speech/breathing)
            if separated.dim() >= 3:
                if separated.shape[-1] <= 4:
                    primary_source = separated[0, :, 0]
                else:
                    primary_source = separated[0, 0, :]
            else:
                primary_source = separated.squeeze()
        elif isinstance(separated, (list, tuple)) and separated:
            primary_source = separated[0]
            source_count = len(separated)
        else:
            primary_source = torch.as_tensor(separated)
            source_count = 1

        if not isinstance(primary_source, torch.Tensor):
            primary_source = torch.as_tensor(primary_source)

        waveform = primary_source.detach().cpu()
        if waveform.dim() == 1:
            waveform = waveform.unsqueeze(0)

        analysis = analyze_waveform(waveform, model_sample_rate)
        logger.info(f"Analysis result: {analysis}")
        return {
            "status": "processed",
            "model": "model.pth",
            "bed_id": bed_id,
            "sources_detected": source_count,
            **analysis,
        }
    except Exception as e:
        logger.error(f"Error processing audio: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=400,
            content={"error": str(e), "type": type(e).__name__}
        )
    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)
            logger.info(f"Cleaned up {audio_path}")