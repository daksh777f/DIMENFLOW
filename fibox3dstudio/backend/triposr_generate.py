"""
TripoSR 3D Model Generation Script
Generates 3D models from images using TripoSR locally
"""
import os
os.environ["CUDA_VISIBLE_DEVICES"] = ""   # force CPU
os.environ["OMP_NUM_THREADS"] = "2"
os.environ["MKL_NUM_THREADS"] = "2"

import sys

# Add TripoSR to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'TripoSR'))

import torch
torch.set_num_threads(2)
torch.set_default_dtype(torch.float32)
from PIL import Image
import trimesh

def generate_3d_model(image_path, output_path):
    """Generate 3D model from image using TripoSR"""
    try:
        # Import TripoSR modules
        print("Importing TripoSR modules...", file=sys.stderr, flush=True)
        from tsr.system import TSR
        from tsr.utils import remove_background, resize_foreground
        
        # Initialize model
        print("Loading TripoSR model from HuggingFace...", file=sys.stderr, flush=True)
        print("(First time will download ~2GB model - please wait)", file=sys.stderr, flush=True)
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Using device: {device}", file=sys.stderr, flush=True)
        
        model = TSR.from_pretrained(
            "stabilityai/TripoSR",
            config_name="config.yaml",
            weight_name="model.ckpt",
        )
        print("Model loaded successfully!", file=sys.stderr, flush=True)
        
        model.renderer.set_chunk_size(8192)
        model.to(device)
        print(f"Model moved to {device}", file=sys.stderr, flush=True)
        
        # Load and process image
        print(f"Processing image: {image_path}", file=sys.stderr, flush=True)
        image = Image.open(image_path).convert('RGB')
        print(f"Image loaded: {image.size}", file=sys.stderr, flush=True)
        
        # Remove background and resize
        print("Removing background...", file=sys.stderr, flush=True)
        image = remove_background(image)
        print("Background removed", file=sys.stderr, flush=True)
        
        image = resize_foreground(image, 0.85)
        print("Image resized", file=sys.stderr, flush=True)
        
        # Generate 3D model
        print("Generating 3D model (this may take 30-120 seconds)...", file=sys.stderr, flush=True)
        with torch.no_grad():
            scene_codes = model([image], device=device)
        print("Scene codes generated", file=sys.stderr, flush=True)
        
        # Extract mesh
        print("Extracting mesh with marching cubes...", file=sys.stderr, flush=True)
        meshes = model.extract_mesh(scene_codes, has_vertex_color=False, resolution=256)
        mesh = meshes[0]
        print(f"Mesh extracted: {len(mesh.vertices)} vertices, {len(mesh.faces)} faces", file=sys.stderr, flush=True)
        
        # Save as GLB
        print(f"Saving to: {output_path}", file=sys.stderr, flush=True)
        mesh.export(output_path)
        print(f"File saved successfully!", file=sys.stderr, flush=True)
        
        print("SUCCESS", file=sys.stdout, flush=True)
        return True
        
    except Exception as e:
        import traceback
        print(f"ERROR: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python triposr_generate.py <input_image> <output_glb>", file=sys.stderr)
        sys.exit(1)
    
    input_image = sys.argv[1]
    output_glb = sys.argv[2]
    
    if not os.path.exists(input_image):
        print(f"ERROR: Input image not found: {input_image}", file=sys.stderr)
        sys.exit(1)
    
    success = generate_3d_model(input_image, output_glb)
    sys.exit(0 if success else 1)
