import io
import os
import sys
import shutil
import logging
from PIL import Image
import fitz  
import pytesseract
from app.core.config import settings

logger = logging.getLogger(__name__)

if settings.TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
    logger.info(f"Tesseract configured from settings: {settings.TESSERACT_CMD}")
elif sys.platform.startswith("win"):
    if not shutil.which("tesseract"):
        common_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        ]
        local_appdata = os.environ.get("LOCALAPPDATA")
        if local_appdata:
            common_paths.append(os.path.join(local_appdata, "Tesseract-OCR", "tesseract.exe"))
            common_paths.append(os.path.join(local_appdata, "Programs", "Tesseract-OCR", "tesseract.exe"))
            
        for path in common_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                logger.info(f"Auto-detected Tesseract at: {path}")
                break


def extract_text_from_image(image_path: str) -> str:
    """
    Extracts text from an image or a scanned PDF file using pytesseract.
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"File not found: {image_path}")

    logger.info(f"Starting Tesseract OCR on: {image_path}")
    ext = os.path.splitext(image_path)[1].lower()
    text = ""

    try:
        if ext == ".pdf":
            doc = fitz.open(image_path)
            for page_num in range(len(doc)):
                logger.info(f"Processing PDF page {page_num + 1}/{len(doc)}")
                page = doc[page_num]
                pix = page.get_pixmap(dpi=150)
                img_data = pix.tobytes("png")
                img = Image.open(io.BytesIO(img_data))
                img = img.convert("L")
                
                # Perform OCR
                page_text = pytesseract.image_to_string(img)
                text += page_text + "\n"
            doc.close()
        else:

            img = Image.open(image_path)
            
            img = img.convert("L")
            
            text = pytesseract.image_to_string(img)
            
    except pytesseract.TesseractNotFoundError:
        error_msg = (
            "Tesseract OCR binary not found. Please install Tesseract on your system "
            "and ensure it is in your system PATH, or set the TESSERACT_CMD configuration."
        )
        logger.error(error_msg)
        raise RuntimeError(error_msg)
    except Exception as e:
        logger.error(f"Error during Tesseract OCR: {e}")
        raise e

    cleaned_text = text.strip()
    
    print("\n===== TESSERACT OCR OUTPUT =====")
    print(cleaned_text[:500])
    print("=================================\n")
    
    return cleaned_text