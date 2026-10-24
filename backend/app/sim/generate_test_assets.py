import math
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from app.config import settings

def create_analog_gauge_image(reading_psi: float, output_path: Path, title: str = "F-17 DIFF PRESSURE"):
    """Generates an industrial analog differential pressure gauge dial."""
    width, height = 400, 400
    img = Image.new("RGB", (width, height), color=(240, 242, 245))
    draw = ImageDraw.Draw(img)
    
    center = (200, 200)
    radius = 160
    
    # Outer bezel
    draw.ellipse((center[0] - radius - 15, center[1] - radius - 15, center[0] + radius + 15, center[1] + radius + 15), fill=(40, 45, 52), outline=(100, 110, 120), width=4)
    # Dial face
    draw.ellipse((center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius), fill=(255, 255, 255), outline=(180, 185, 190), width=2)
    
    # Scale: 0 to 25 psi.
    # Start angle: 140 deg, End angle: 400 deg (span 260 deg)
    start_angle = 140.0
    total_span = 260.0
    
    # Color bands
    # Normal (0 to 3 psi): Green
    # Warning (3 to 8 psi): Yellow
    # Critical (8 to 25 psi): Red
    norm_span = total_span * (3.0 / 25.0)
    warn_span = total_span * (5.0 / 25.0)
    crit_span = total_span * (17.0 / 25.0)
    
    arc_box = (center[0] - radius + 20, center[1] - radius + 20, center[0] + radius - 20, center[1] + radius - 20)
    draw.arc(arc_box, start=140, end=140 + norm_span, fill=(46, 204, 113), width=8)
    draw.arc(arc_box, start=140 + norm_span, end=140 + norm_span + warn_span, fill=(241, 196, 15), width=8)
    draw.arc(arc_box, start=140 + norm_span + warn_span, end=400, fill=(231, 76, 60), width=8)
    
    # Tick marks
    for val in range(0, 26, 5):
        fraction = val / 25.0
        angle_deg = start_angle + (fraction * total_span)
        angle_rad = math.radians(angle_deg)
        
        inner_r = radius - 35
        outer_r = radius - 10
        x1 = center[0] + inner_r * math.cos(angle_rad)
        y1 = center[1] + inner_r * math.sin(angle_rad)
        x2 = center[0] + outer_r * math.cos(angle_rad)
        y2 = center[1] + outer_r * math.sin(angle_rad)
        draw.line([(x1, y1), (x2, y2)], fill=(30, 30, 30), width=3)
        
        # Label position
        lx = center[0] + (inner_r - 20) * math.cos(angle_rad) - 6
        ly = center[1] + (inner_r - 20) * math.sin(angle_rad) - 6
        draw.text((lx, ly), str(val), fill=(20, 20, 20))

    # Needle
    curr_fraction = max(0.0, min(1.0, reading_psi / 25.0))
    needle_angle_deg = start_angle + (curr_fraction * total_span)
    needle_rad = math.radians(needle_angle_deg)
    
    needle_r = radius - 25
    nx = center[0] + needle_r * math.cos(needle_rad)
    ny = center[1] + needle_r * math.sin(needle_rad)
    draw.line([center, (nx, ny)], fill=(231, 76, 60), width=4)
    # Center cap
    draw.ellipse((center[0] - 12, center[1] - 12, center[0] + 12, center[1] + 12), fill=(30, 30, 30))
    
    # Title & Text
    draw.text((center[0] - 65, center[1] + 50), title, fill=(40, 50, 60))
    draw.text((center[0] - 25, center[1] + 70), "PSI (DIFF)", fill=(100, 110, 120))
    draw.text((center[0] - 30, center[1] + 95), f"{reading_psi:.1f} psi", fill=(20, 20, 20))
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path, "JPEG", quality=90)

def create_valve_dial_image(position: str, output_path: Path):
    """Generates an image of manual bypass valve BV-104 position indicator."""
    width, height = 400, 400
    img = Image.new("RGB", (width, height), color=(235, 238, 242))
    draw = ImageDraw.Draw(img)
    
    center = (200, 200)
    radius = 140
    
    # Pipe flange background
    draw.rectangle([60, 175, 340, 225], fill=(120, 130, 140), outline=(80, 90, 100), width=3)
    # Valve body bonnet
    draw.rectangle([165, 80, 235, 200], fill=(85, 95, 105), outline=(50, 60, 70), width=3)
    
    # Valve dial index plate
    draw.ellipse((center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius), fill=(245, 245, 248), outline=(60, 70, 80), width=4)
    
    # Indicators: CLOSED at 180 deg, OPEN at 90 deg
    draw.text((center[0] - 110, center[1] - 10), "CLOSED [0%]", fill=(200, 40, 40))
    draw.text((center[0] - 35, center[1] - 120), "OPEN [100%]", fill=(40, 160, 60))
    
    # Handwheel & Pointer Needle
    if position == "OPEN":
        pointer_angle = -90.0 # Points up to OPEN
        color = (46, 204, 113)
        label = "VERIFIED: 100% OPEN"
    elif position == "PROBE":
        pointer_angle = -150.0 # ~15% open
        color = (241, 196, 15)
        label = "PROBE: ~10% OPEN"
    else: # CLOSED
        pointer_angle = 180.0
        color = (231, 76, 60)
        label = "POSITION: CLOSED"

    prad = math.radians(pointer_angle)
    px = center[0] + (radius - 30) * math.cos(prad)
    py = center[1] + (radius - 30) * math.sin(prad)
    
    # Handwheel spoke
    draw.line([center, (px, py)], fill=(20, 25, 30), width=8)
    # Bright arrow tip
    draw.line([(center[0] + (radius - 50)*math.cos(prad), center[1] + (radius - 50)*math.sin(prad)), (px, py)], fill=color, width=10)
    draw.ellipse((center[0] - 20, center[1] - 20, center[0] + 20, center[1] + 20), fill=(40, 45, 50))
    
    draw.text((center[0] - 60, center[1] + 60), "VALVE BV-104", fill=(30, 35, 40))
    draw.text((center[0] - 70, center[1] + 85), label, fill=color)
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path, "JPEG", quality=90)

if __name__ == "__main__":
    out_dir = settings.EVIDENCE_PATH
    create_analog_gauge_image(14.2, out_dir / "gauge_f17_high_dp.jpg", "F-17 DIFF PRESSURE (HIGH)")
    create_analog_gauge_image(1.8, out_dir / "gauge_f17_normal.jpg", "F-17 DIFF PRESSURE (CLEAN)")
    create_valve_dial_image("OPEN", out_dir / "valve_bv104_open.jpg")
    create_valve_dial_image("PROBE", out_dir / "valve_bv104_probe.jpg")
    create_valve_dial_image("CLOSED", out_dir / "valve_bv104_closed.jpg")
    print("Sample test evidence assets created successfully!")
