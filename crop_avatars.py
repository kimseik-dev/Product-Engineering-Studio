import os
from PIL import Image

def crop_grid(image_path, output_dir, prefix):
    if not os.path.exists(image_path):
        print(f"Skipping: {image_path} not found.")
        return []
    
    img = Image.open(image_path)
    width, height = img.size
    
    # 3x3 grid calculation
    cell_width = width // 3
    cell_height = height // 3
    
    count = 1
    paths = []
    for row in range(3):
        for col in range(3):
            left = col * cell_width
            top = row * cell_height
            right = (col + 1) * cell_width
            bottom = (row + 1) * cell_height
            
            # Crop a bit tighter to remove grid lines if any (optional)
            padding = 2
            cell = img.crop((left + padding, top + padding, right - padding, bottom - padding))
            
            filename = f"{prefix}_{count}.png"
            filepath = os.path.join(output_dir, filename)
            cell.save(filepath, "PNG")
            print(f"Saved: {filepath}")
            paths.append(filename)
            count += 1
    return paths

output_path = "frontend/public/avatars"
os.makedirs(output_path, exist_ok=True)

# Image files generated in previous steps
images = [
    ("/Users/si.kimmayoube.co.kr/.gemini/antigravity/brain/ab91b7f2-c725-496b-bd26-d18cd1f729f7/female_avatars_grid_1775707571895.png", "woman"),
    ("/Users/si.kimmayoube.co.kr/.gemini/antigravity/brain/ab91b7f2-c725-496b-bd26-d18cd1f729f7/male_avatars_grid_1775707585475.png", "man"),
    ("/Users/si.kimmayoube.co.kr/.gemini/antigravity/brain/ab91b7f2-c725-496b-bd26-d18cd1f729f7/mixed_avatars_grid_premium_1775707603331.png", "mixed")
]

all_saved = []
for path, prefix in images:
    saved = crop_grid(path, output_path, prefix)
    all_saved.extend(saved)

print(f"Total {len(all_saved)} avatars cropped and saved to {output_path}")
