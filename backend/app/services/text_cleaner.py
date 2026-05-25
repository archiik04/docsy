import re


def clean_text(text: str) -> str:

    if not text:
        return ""

    # remove excessive newlines
    text = re.sub(r"\n+", "\n", text)

    # remove multiple spaces
    text = re.sub(r"\s+", " ", text)

    # remove weird unicode artifacts
    text = text.replace("\uf0b7", "")
    text = text.replace("\u2022", "")

    # strip
    text = text.strip()

    return text