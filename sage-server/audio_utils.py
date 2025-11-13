import torch
import torchaudio

# ----- helpers -----
INT16_MAX = 32767.0
QCHAN = 256  # μ-law uses 256 quantization levels

def mulaw8k_bytes_to_pcm16_24k(mulaw_bytes: bytes) -> bytes:
    """
    μ-law 8 kHz (G.711) -> PCM16 24 kHz (mono)
    returns raw little-endian int16 bytes
    """
    # bytes -> uint8 tensor (N,)
    mu = torch.frombuffer(bytearray(mulaw_bytes), dtype=torch.uint8).to(torch.int64)

    # μ-law decode -> float32 in [-1, 1]
    wav_8k = torchaudio.functional.mu_law_decoding(mu, quantization_channels=QCHAN).to(torch.float32)

    # shape to (channels, time)
    wav_8k = wav_8k.unsqueeze(0)  # (1, T)

    # resample 8k -> 24k
    resampler = torchaudio.transforms.Resample(orig_freq=8000, new_freq=24000)
    wav_24k = resampler(wav_8k)  # (1, T')

    # float [-1,1] -> int16 bytes
    pcm16 = (wav_24k.clamp(-1, 1) * INT16_MAX).round().to(torch.int16).squeeze(0).numpy().tobytes()
    return pcm16

def pcm16_24k_bytes_to_mulaw8k(pcm16_24k: bytes) -> bytes:
    """
    PCM16 24 kHz (mono) -> μ-law 8 kHz (G.711)
    returns raw μ-law bytes (1 byte/sample @ 8 kHz)
    """
    # bytes -> float32 [-1,1] tensor (1, T)
    x = torch.frombuffer(bytearray(pcm16_24k), dtype=torch.int16).to(torch.float32) / INT16_MAX
    x = x.unsqueeze(0)  # (1, T)

    # resample 24k -> 8k
    resampler = torchaudio.transforms.Resample(orig_freq=24000, new_freq=8000)
    x8 = resampler(x).squeeze(0)  # (T8,)

    # μ-law encode -> LongTensor [0..255]
    mu = torchaudio.functional.mu_law_encoding(x8, quantization_channels=QCHAN).to(torch.uint8)

    # tensor -> bytes
    return mu.numpy().tobytes()
