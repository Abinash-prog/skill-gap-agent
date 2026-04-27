import traceback
import pdfplumber

def extract_text_from_pdf(file_bytes)-> str:
    """
    Extract all text from a PDF given its raw bytes.
    Returns cleaned text string.
    Raises ValueError if PDF is empty or unreadable.
    """
    try:
        text_pages  = []

        with pdfplumber.open(file_bytes) as pdf:

            if len(pdf.pages) == 0:
                raise ValueError("PDF has no pages")
            
            if len(pdf.pages) > 4:
                raise ValueError(
                    f"PDF has {len(pdf.pages)} pages"
                    "Please upload a resume (max 4 pages)"
                )
            
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    text_pages.append(text.strip())
            
        if not text_pages:
            raise ValueError(
                "Could not extract any text from the PDF. "
                "Make sure it is not a scanned image PDF."
            )
        
        full_text = "\n\n".join(text_pages)

        # guard: extracted text too short to be a real resume
        if len(full_text.strip()) < 50:
            raise ValueError(
                "Extracted text is too short. "
                "Please make sure the PDF contains readable text."
            )

        return full_text.strip()

    except ValueError:
        # re-raise our own validation errors as-is
        raise

    except Exception as e:
        traceback.print_exc()
        raise ValueError(f"Failed to read PDF: {str(e)}")