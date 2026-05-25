import re


def clean_text(text: str) -> str:

    text = text.replace("\n", " ")

    text = re.sub(r"\s+", " ", text)

    text = re.sub(r"Page \d+", "", text)

    text = re.sub(r"\uf0b7", "", text)

    return text.strip()