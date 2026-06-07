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

OCR_LANGUAGES = (
    "eng+hin+ori+ben+tam+tel+kan+mal+mar+guj+pan"
)

OCR_CONFIG = "--oem 3 --psm 6"

if settings.TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
    logger.info(
        f"Tesseract configured from settings: {settings.TESSERACT_CMD}"
    )

elif sys.platform.startswith("win"):
    if not shutil.which("tesseract"):
        common_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        ]
        local_appdata = os.environ.get("LOCALAPPDATA")
        if local_appdata:
            common_paths.extend(
                [
                    os.path.join(
                        local_appdata,
                        "Tesseract-OCR",
                        "tesseract.exe",
                    ),

                    os.path.join(
                        local_appdata,
                        "Programs",
                        "Tesseract-OCR",
                        "tesseract.exe",
                    ),
                ]
            )

        for path in common_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                logger.info(
                    f"Auto-detected Tesseract at: {path}"
                )
                break

def preprocess_image(img: Image.Image) -> Image.Image:

    """
    Improve OCR quality for scanned documents.
    """

    # Convert to grayscale
    img = img.convert("L")


    # Simple thresholding

    img = img.point(
        lambda x: 0 if x < 128 else 255,
        "1"
    )
    return img


def extract_text_from_image(image_path: str) -> str:

    """

    Extract text from:
    - Images (PNG, JPG, JPEG)
    - Scanned PDFs
    Uses multilingual Tesseract OCR.

    """

    if not os.path.exists(image_path):
        raise FileNotFoundError(
            f"File not found: {image_path}"
        )

    logger.info(
        f"Starting Tesseract OCR on: {image_path}"
    )

    ext = os.path.splitext(image_path)[1].lower()
    text = ""
    try:
        if ext == ".pdf":
            doc = fitz.open(image_path)
            for page_num in range(len(doc)):
                logger.info(
                    f"Processing PDF page "
                    f"{page_num + 1}/{len(doc)}"
                )
                page = doc[page_num]
                # Increase DPI for better OCR
                pix = page.get_pixmap(dpi=300)
                img_data = pix.tobytes("png")

                img = Image.open(

                    io.BytesIO(img_data)
                )
                img = preprocess_image(img)
                page_text = pytesseract.image_to_string(
                    img,
                    lang=OCR_LANGUAGES,
                    config=OCR_CONFIG,

                )
                text += page_text + "\n"
            doc.close()
        else:
            img = Image.open(image_path)
            img = preprocess_image(img)
            text = pytesseract.image_to_string(
                img,
                lang=OCR_LANGUAGES,
                config=OCR_CONFIG,
            )


    except pytesseract.TesseractNotFoundError:
        error_msg = (
            "Tesseract OCR binary not found. "
            "Please install Tesseract and "
            "configure TESSERACT_CMD."
        )
        logger.error(error_msg)
        raise RuntimeError(error_msg)
    except Exception as e:
        logger.error(
            f"Error during OCR processing: {e}"
        )
        raise

    cleaned_text = text.strip()

    logger.info(
        f"OCR completed. "
        f"Extracted {len(cleaned_text)} characters."
    )

    return cleaned_text