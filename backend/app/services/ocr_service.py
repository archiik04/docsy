import easyocr

reader = easyocr.Reader(['en'])

def extract_text_from_image(image_path):

    results = reader.readtext(
        str(image_path),
        detail=0
    )

    return "\n".join(results)