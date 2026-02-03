# TripoSR Setup Instructions

## Prerequisites
1. Python 3.8 or higher installed
2. Git installed

## Installation Steps

### 1. Install TripoSR
```bash
cd backend
pip install git+https://github.com/VAST-AI-Research/TripoSR.git
pip install -r requirements.txt
```

### 2. Test Installation
```bash
python triposr_generate.py test_image.png output.glb
```

## How It Works
- The Node.js backend downloads the image temporarily
- Calls the Python script as a subprocess
- Python uses TripoSR to generate a real 3D model
- Returns the GLB file path to Node.js
- Node.js uploads it to Supabase Storage

## Benefits
✅ 100% Free - runs locally on your machine
✅ Real 3D models - not just textured boxes
✅ Works offline - no API calls needed
✅ No rate limits or quotas

## System Requirements
- GPU recommended (CUDA) for faster generation (30 seconds)
- CPU works too but slower (2-3 minutes per model)
- ~4GB RAM minimum
- ~2GB disk space for model weights
