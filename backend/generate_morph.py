"""
Generate a morph GIF from two images using the node mapping.
Run this once to create the GIF, then serve it statically.
"""

import json
import numpy as np
from PIL import Image
import imageio
from scipy.interpolate import griddata
import os

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
IANMORPH_DIR = os.path.join(SCRIPT_DIR, '..', 'frontend', 'public', 'ianmorph')

IMG1_PATH = os.path.join(IANMORPH_DIR, 'IAN1.jpg')
IMG2_PATH = os.path.join(IANMORPH_DIR, 'IAN2.jpg')
NODES_PATH = os.path.join(IANMORPH_DIR, 'nodes (1).json')
OUTPUT_PATH = os.path.join(IANMORPH_DIR, 'ian_morph.gif')

# Settings
NUM_FRAMES = 30  # Number of frames in the morph
FRAME_DURATION = 0.066  # ~15fps, total ~2 seconds
OUTPUT_SIZE = (400, 400)  # Output GIF size


def load_nodes(path):
    """Load the node mapping from JSON."""
    with open(path, 'r') as f:
        data = json.load(f)
    return data[0], data[1]  # nodes1, nodes2


def create_mesh_grid(nodes, size):
    """Convert node list to mesh grid coordinates."""
    # Nodes are in 0-1 normalized coordinates
    points = []
    values_x = []
    values_y = []
    
    for node in nodes:
        # Source position (where to sample from)
        points.append([node['u'], node['v']])
        # Destination position (where it appears)
        values_x.append(node['x'])
        values_y.append(node['y'])
    
    return np.array(points), np.array(values_x), np.array(values_y)


def warp_image(img, nodes, size):
    """Warp an image according to node positions."""
    h, w = size
    
    # Create output coordinate grid
    y_coords, x_coords = np.mgrid[0:h, 0:w]
    y_norm = y_coords / h
    x_norm = x_coords / w
    
    # Get node mapping
    points, dest_x, dest_y = create_mesh_grid(nodes, size)
    
    # Interpolate the warp field
    # For each output pixel, find where to sample from input
    grid_points = np.column_stack([x_norm.ravel(), y_norm.ravel()])
    
    # Map destination -> source using inverse mapping
    source_x = griddata(
        np.column_stack([dest_x, dest_y]), 
        points[:, 0], 
        grid_points, 
        method='cubic',
        fill_value=0
    ).reshape(h, w)
    
    source_y = griddata(
        np.column_stack([dest_x, dest_y]), 
        points[:, 1], 
        grid_points, 
        method='cubic',
        fill_value=0
    ).reshape(h, w)
    
    # Convert to pixel coordinates
    img_h, img_w = img.shape[:2]
    sample_x = (source_x * img_w).astype(np.float32)
    sample_y = (source_y * img_h).astype(np.float32)
    
    # Clip to valid range
    sample_x = np.clip(sample_x, 0, img_w - 1)
    sample_y = np.clip(sample_y, 0, img_h - 1)
    
    # Sample the image (simple nearest neighbor for speed)
    sample_x_int = sample_x.astype(np.int32)
    sample_y_int = sample_y.astype(np.int32)
    
    warped = img[sample_y_int, sample_x_int]
    return warped


def interpolate_nodes(nodes1, nodes2, t):
    """Interpolate between two node sets."""
    interpolated = []
    for n1, n2 in zip(nodes1, nodes2):
        interpolated.append({
            'x': n1['x'] * (1 - t) + n2['x'] * t,
            'y': n1['y'] * (1 - t) + n2['y'] * t,
            'u': n1['u'],
            'v': n1['v']
        })
    return interpolated


def generate_morph_gif():
    """Generate the morph GIF."""
    print("Loading images...")
    img1 = Image.open(IMG1_PATH).convert('RGB')
    img2 = Image.open(IMG2_PATH).convert('RGB')
    
    # Resize to output size
    img1 = img1.resize(OUTPUT_SIZE, Image.Resampling.LANCZOS)
    img2 = img2.resize(OUTPUT_SIZE, Image.Resampling.LANCZOS)
    
    img1_np = np.array(img1)
    img2_np = np.array(img2)
    
    print("Loading node mapping...")
    nodes1, nodes2 = load_nodes(NODES_PATH)
    
    print(f"Generating {NUM_FRAMES} frames...")
    frames = []
    
    for i in range(NUM_FRAMES):
        t = i / (NUM_FRAMES - 1)
        print(f"  Frame {i+1}/{NUM_FRAMES} (t={t:.2f})")
        
        # Interpolate nodes
        current_nodes1 = interpolate_nodes(nodes1, nodes1, 0)  # Keep nodes1 fixed for source
        current_nodes2 = interpolate_nodes(nodes1, nodes2, t)  # Interpolate for warp
        
        # Warp both images to interpolated positions
        warped1 = warp_image(img1_np, interpolate_nodes(nodes1, nodes2, t), OUTPUT_SIZE)
        warped2 = warp_image(img2_np, interpolate_nodes(nodes2, nodes1, 1-t), OUTPUT_SIZE)
        
        # Cross-fade between warped images
        alpha = t
        blended = (warped1 * (1 - alpha) + warped2 * alpha).astype(np.uint8)
        
        frames.append(blended)
    
    print(f"Saving GIF to {OUTPUT_PATH}...")
    imageio.mimsave(
        OUTPUT_PATH, 
        frames, 
        duration=FRAME_DURATION,
        loop=0  # Loop forever
    )
    
    # Also save as WebP for better quality/size
    webp_path = OUTPUT_PATH.replace('.gif', '.webp')
    print(f"Saving WebP to {webp_path}...")
    imageio.mimsave(
        webp_path,
        frames,
        duration=FRAME_DURATION,
        loop=0
    )
    
    print("Done!")
    print(f"GIF size: {os.path.getsize(OUTPUT_PATH) / 1024:.1f} KB")
    if os.path.exists(webp_path):
        print(f"WebP size: {os.path.getsize(webp_path) / 1024:.1f} KB")


if __name__ == '__main__':
    generate_morph_gif()

