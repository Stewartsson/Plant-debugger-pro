import math
import struct
import io
import wave
import numpy as np

def generate_pump_audio_wav(
    duration_sec: float = 3.0,
    sample_rate: int = 44100,
    is_cavitating: bool = False,
    cavitation_severity: float = 0.0,
    is_bearing_wear: bool = False
) -> bytes:
    """
    Synthesizes physics-grounded acoustic audio representing an industrial centrifugal pump.
    - Base: 60Hz mechanical drive hum + 2950 RPM blade pass frequency (~196 Hz) + fluid turbulence.
    - Cavitation: Characteristic high-frequency stochastic impulse crackle (4-9 kHz).
    - Bearing fault: Modulated periodic metallic knock.
    """
    num_samples = int(duration_sec * sample_rate)
    t = np.linspace(0, duration_sec, num_samples, endpoint=False)
    
    # 1. Base Mechanical Drive Hum (60Hz + harmonics)
    hum_60 = 0.25 * np.sin(2 * np.pi * 60 * t)
    hum_120 = 0.15 * np.sin(2 * np.pi * 120 * t)
    hum_180 = 0.08 * np.sin(2 * np.pi * 180 * t)
    
    # 2. Blade Pass Frequency: 4-vane impeller @ 2950 RPM = (2950/60)*4 = ~196.7 Hz
    bpf = 0.20 * np.sin(2 * np.pi * 196.67 * t)
    
    # 3. Fluid turbulence (Pink/Gaussian noise)
    turbulent_noise = np.random.normal(0, 0.08, num_samples)
    
    # Composite baseline
    signal = hum_60 + hum_120 + hum_180 + bpf + turbulent_noise
    
    # 4. Cavitation Impulses (Vapor bubble collapse)
    if is_cavitating or cavitation_severity > 0.05:
        severity = max(cavitation_severity, 0.7 if is_cavitating else 0.0)
        # Random Poisson-like impulse clicks
        burst_rate = int(severity * 400) # 400 bursts per second
        impulse_indices = np.random.choice(num_samples, size=int(burst_rate * duration_sec), replace=False)
        
        cavit_signal = np.zeros(num_samples)
        # High frequency burst ~ 5000 Hz decaying rapidly (decay in 0.5 ms = 22 samples)
        burst_len = 30
        decay = np.exp(-np.linspace(0, 5, burst_len))
        burst_wave = np.sin(2 * np.pi * 5500 * np.linspace(0, burst_len/sample_rate, burst_len)) * decay
        
        for idx in impulse_indices:
            if idx + burst_len < num_samples:
                cavit_signal[idx : idx + burst_len] += (np.random.uniform(0.5, 1.2) * severity) * burst_wave
                
        signal += cavit_signal
        
    # 5. Bearing Wear Modulation
    if is_bearing_wear:
        bearing_knock = 0.35 * np.sin(2 * np.pi * 12.5 * t) ** 4 * np.sin(2 * np.pi * 1850 * t)
        signal += bearing_knock

    # Normalize to -0.95 to 0.95
    max_val = np.max(np.abs(signal))
    if max_val > 0:
        signal = (signal / max_val) * 0.92
        
    # Convert to 16-bit PCM WAV
    audio_int16 = (signal * 32767).astype(np.int16)
    
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as wav_file:
        wav_file.setnchannels(1)        # Mono
        wav_file.setsampwidth(2)       # 2 bytes = 16 bit
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio_int16.tobytes())
        
    return buffer.getvalue()
