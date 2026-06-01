import fitz

from docx import Document


def extract_pdf_text(file_path):

    pdf_document = fitz.open(file_path)

    text = ""

    for page in pdf_document:

        text += page.get_text() + "\n"

    pdf_document.close()

    return text


def extract_txt_text(file_path):

    with open(
        file_path,
        "r",
        encoding="utf-8"
    ) as file:

        return file.read()


def extract_docx_text(file_path):

    doc = Document(file_path)

    text = "\n".join(
        paragraph.text
        for paragraph in doc.paragraphs
    )

    return text