import os
from PIL import Image, ImageDraw

base_icon_path = r'C:\Users\krish\.gemini\antigravity\brain\fc65e26c-e2b5-4d17-bcfd-e903dc44a7d9\test_icon_perfect.png'
base_icon = Image.open(base_icon_path).convert('RGBA')

# 1. Update public/logo.png
base_icon.save('public/logo.png')
print('Updated public/logo.png')

# 2. Update ic_launcher_background.xml
bg_xml = """<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0C1523</color>
</resources>
"""
with open('android/app/src/main/res/values/ic_launcher_background.xml', 'w', encoding='utf-8') as f:
    f.write(bg_xml)
print('Updated ic_launcher_background.xml')

# Mipmap densities and their dimensions
# (folder, standard_size, adaptive_foreground_size)
densities = [
    ('mipmap-mdpi', 48, 108),
    ('mipmap-hdpi', 72, 162),
    ('mipmap-xhdpi', 96, 216),
    ('mipmap-xxhdpi', 144, 324),
    ('mipmap-xxxhdpi', 192, 432),
]

for folder, std_size, fg_size in densities:
    folder_path = os.path.join('android', 'app', 'src', 'main', 'res', folder)
    os.makedirs(folder_path, exist_ok=True)
    
    # --- A. Adaptive Foreground (fg_size x fg_size) ---
    # Safe zone for Android adaptive icons is the central 72/108 (~66.7%).
    # We scale the emblem into the center (68% size).
    fg_canvas = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
    emblem_size = int(fg_size * 0.70)
    resized_emblem = base_icon.resize((emblem_size, emblem_size), Image.Resampling.LANCZOS)
    offset = (fg_size - emblem_size) // 2
    fg_canvas.paste(resized_emblem, (offset, offset), resized_emblem)
    fg_canvas.save(os.path.join(folder_path, 'ic_launcher_foreground.png'))
    
    # --- B. Standard ic_launcher.png (std_size x std_size) ---
    std_icon = base_icon.resize((std_size, std_size), Image.Resampling.LANCZOS)
    corner_radius = int(std_size * 0.20)
    mask = Image.new('L', (std_size, std_size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), (std_size - 1, std_size - 1)], radius=corner_radius, fill=255)
    std_rounded = Image.new('RGBA', (std_size, std_size), (0, 0, 0, 0))
    std_rounded.paste(std_icon, (0, 0), mask)
    std_rounded.save(os.path.join(folder_path, 'ic_launcher.png'))
    
    # --- C. Round ic_launcher_round.png (std_size x std_size) ---
    circle_mask = Image.new('L', (std_size, std_size), 0)
    circle_draw = ImageDraw.Draw(circle_mask)
    circle_draw.ellipse([(0, 0), (std_size - 1, std_size - 1)], fill=255)
    round_icon = Image.new('RGBA', (std_size, std_size), (0, 0, 0, 0))
    round_icon.paste(std_icon, (0, 0), circle_mask)
    round_icon.save(os.path.join(folder_path, 'ic_launcher_round.png'))
    
    print(f'Generated icons for {folder}: std={std_size}x{std_size}, fg={fg_size}x{fg_size}')

print('All Android app icons generated successfully!')
