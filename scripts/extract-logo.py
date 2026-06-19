import os
import sys
from pypdf import PdfReader

def extract_logo():
    pdf_path = "look bool vol1 pdf.pdf"
    output_dir = "public"
    output_path = os.path.join(output_dir, "logo.jpg")

    if not os.path.exists(pdf_path):
        print(f"Error: PDF file '{pdf_path}' not found.", file=sys.stderr)
        sys.exit(1)

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    try:
        print(f"Reading PDF from '{pdf_path}'...")
        reader = PdfReader(pdf_path)
        if len(reader.pages) == 0:
            print("Error: PDF has 0 pages.", file=sys.stderr)
            sys.exit(1)

        first_page = reader.pages[0]
        images = list(first_page.images)
        
        if len(images) == 0:
            print("Error: No images found on page 1 of the PDF.", file=sys.stderr)
            sys.exit(1)

        # 獲取第一個圖片
        logo_image = images[0]
        print(f"Found image: {logo_image.name}, size: {len(logo_image.data)} bytes")

        # 寫入檔案
        with open(output_path, "wb") as f:
            f.write(logo_image.data)

        print(f"Successfully extracted logo image to '{output_path}'")

    except Exception as e:
        print(f"Error during extraction: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    extract_logo()
