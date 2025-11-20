from PIL import Image
import numpy as np


def preprocess_image_pil(img: Image.Image, size=(224,224)) -> np.ndarray:
    """Resize and normalize PIL image to numpy array (CHW, float32)"""
    img = img.convert('RGB')
    img = img.resize(size)
    arr = np.array(img).astype('float32') / 255.0
    # normalize with ImageNet stats by default
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    arr = (arr - mean) / std
    # HWC -> CHW
    arr = np.transpose(arr, (2,0,1))
    return arr
