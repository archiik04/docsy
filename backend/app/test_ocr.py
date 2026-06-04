import os
import sys
from PIL import Image, ImageDraw, ImageFont

# Add backend directory to path to import services correctly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.ocr_service import extract_text_from_image

def main():
    print("Initializing Tesseract OCR test...")
    
    # Create a simple image with text
    test_image_path = "ocr-test-temp.png"
    img = Image.new("RGB", (400, 150), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    
    # Draw simple text
    d.text((20, 20), "DOCSY OCR TEST", fill=(0, 0, 0))
    d.text((20, 50), "Name: Cutie", fill=(0, 0, 0))
    d.text((20, 80), "University: KIIT", fill=(0, 0, 0))
    d.text((20, 110), "This is an OCR test.", fill=(0, 0, 0))
    
    img.save(test_image_path)
    print(f"Created temporary test image: {test_image_path}")

    try:
        print("Running Tesseract OCR extraction...")
        text = extract_text_from_image(test_image_path)
        print("--- OCR Result ---")
        print(text)
        print("------------------")
        
        # Verify text contents
        if "DOCSY" in text or "TEST" in text or "Cutie" in text:
            print("[SUCCESS] OCR extracted text successfully!")
        else:
            print("[WARNING] OCR finished but text might be empty or incorrect.")
            
    except Exception as e:
        print(f"[ERROR] OCR test failed: {e}")
        
    finally:
        # Clean up
        if os.path.exists(test_image_path):
            os.remove(test_image_path)
            print("Cleaned up temporary test image.")

if __name__ == "__main__":
    main()
