# test_faithfulness_probe.py
#
# Standalone probe for generation/faithfulness.py.
# Bypasses retrieval and the LLM entirely — feeds check_faithfulness()
# the real chunk text plus hand-picked answer strings, so the checker
# itself is what's being tested, not whether Groq happens to hallucinate.
#
# Run from project root: python test_faithfulness_probe.py

from generation.faithfulness import check_faithfulness

# Verbatim text of the ICU staffing ratio table as it appears in
# Meridian_Clinical_Operations_Manual.pdf. Update this if the actual
# indexed chunk text differs due to chunking boundaries.
icu_chunk_text = (
    "1. Staffing Ratios. Minimum nurse-to-patient staffing ratios are "
    "mandatory on every shift and may not be waived without written "
    "approval from the Chief Nursing Officer. Intensive Care Unit (ICU): "
    "2. Medical-Surgical: 5. Emergency Department: 4. "
    "Post-Anesthesia Care Unit (PACU): 2. General Pediatrics: 4."
)

chunks = [
    {
        "text": icu_chunk_text,
        "filename": "Meridian_Clinical_Operations_Manual.pdf",
        "page_number": 1,
    }
]

cases = [
    (
        "correct_answer",
        "The ICU nurse-to-patient ratio is 2 patients per nurse.",
    ),
    (
        "wrong_number",
        "The ICU nurse-to-patient ratio is 3 patients per nurse.",
    ),
    (
        "wrong_number_verbose",
        "According to Meridian's Clinical Operations Policy Manual, the "
        "maximum nurse-to-patient ratio permitted in the Intensive Care "
        "Unit is 3 patients per nurse, and this ratio may not be waived "
        "without written approval from the Chief Nursing Officer.",
    ),
    (
        "off_template_refusal",
        "I don't have information on that in the documents provided.",
    ),
    (
        "exact_marker_refusal",
        "This information was not found in the provided company documents.",
    ),
]

print(f"{'case':<24} {'score':>6} {'flagged':>9}")
print("-" * 42)
for label, answer in cases:
    score, flagged = check_faithfulness(answer, chunks)
    print(f"{label:<24} {score:>6} {str(flagged):>9}")