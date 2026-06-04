import requests
from app.core.config import settings

OCR_SPACE_API_KEY = settings.OCR_SPACE_API_KEY

def extract_text_from_image(image_path: str) -> str:

    with open(image_path, "rb") as image_file:

        response = requests.post(
            "https://api.ocr.space/parse/image",
            files={
                "file": image_file
            },
            data={
                "apikey": OCR_SPACE_API_KEY,
                "language": "eng",
                "OCREngine": 2,
                "isOverlayRequired": False
            }
        )

    result = response.json()

    if result.get("IsErroredOnProcessing"):
        raise Exception(
            result.get("ErrorMessage")
        )

    text = ""

    for page in result.get("ParsedResults", []):
        text += page.get(
            "ParsedText",
            ""
        )
        text += "\n"

    print("\n===== OCR SPACE OUTPUT =====")
    print(text[:500])
    print("============================\n")

    return text.strip()