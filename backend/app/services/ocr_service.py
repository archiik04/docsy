import re
from PIL import Image

_ocr_predictor = None


def get_ocr_predictor():
    global _ocr_predictor

    if _ocr_predictor is None:

        print(
            "\n===== INITIALIZING SURYA OCR MODEL ====="
        )

        from surya.inference import (
            SuryaInferenceManager
        )

        from surya.recognition import (
            RecognitionPredictor
        )

        manager = SuryaInferenceManager()

        _ocr_predictor = RecognitionPredictor(
            manager
        )

        print(
            "===== SURYA OCR MODEL LOADED =====\n"
        )

    return _ocr_predictor


def extract_text_from_image(
    image_path
):

    try:

        ocr = get_ocr_predictor()

        with Image.open(
            image_path
        ) as image:

            results = ocr([
                image
            ])

        if not results:

            print(
                "\n===== SURYA RETURNED NO RESULTS =====\n"
            )

            return ""

        page = results[0]

        text_parts = []

        for block in page.blocks:

            text = re.sub(
                r"<[^>]+>",
                "",
                block.html
            )

            text = text.strip()

            if text:

                text_parts.append(
                    text
                )

        combined_text = "\n".join(
            text_parts
        )

        print(
            "\n===== SURYA OCR OUTPUT ====="
        )

        print(
            combined_text[:500]
            + (
                "..."
                if len(combined_text) > 500
                else ""
            )
        )

        print(
            "===========================\n"
        )

        return combined_text

    except Exception as e:

        print(
            f"\n===== SURYA OCR ERROR =====\n{e}\n"
        )

        return ""