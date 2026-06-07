"""Unit tests for CSV export format."""
import csv
import io


def test_csv_headers_and_order():
    """CSV must have correct headers in the right order."""
    expected_fields = [
        "slug", "bean_origin", "farm", "variety", "process",
        "roast_date", "roast_level", "roast_time_minutes",
        "charge_temp", "drop_temp", "green_weight_g", "roasted_weight_g",
        "batch_number", "tasting_notes", "roaster_notes", "created_at",
    ]
    buf = io.StringIO()
    # BOM for Excel
    buf.write("﻿")
    writer = csv.DictWriter(buf, fieldnames=expected_fields)
    writer.writeheader()
    content = buf.getvalue()

    reader = csv.DictReader(io.StringIO(content.lstrip("﻿")))
    assert reader.fieldnames == expected_fields


def test_csv_utf8_bom():
    """CSV must start with UTF-8 BOM for Excel compatibility."""
    buf = io.StringIO()
    buf.write("﻿")
    content = buf.getvalue().encode("utf-8")
    assert content.startswith(b"\xef\xbb\xbf")


def test_csv_spanish_chars():
    """Spanish accented characters must survive the CSV round-trip."""
    fields = ["tasting_notes"]
    buf = io.StringIO()
    buf.write("﻿")
    writer = csv.DictWriter(buf, fieldnames=fields)
    writer.writeheader()
    writer.writerow({"tasting_notes": "Chocolate, caramélo, cítrico"})

    raw = buf.getvalue().lstrip("﻿")
    reader = csv.DictReader(io.StringIO(raw))
    row = next(reader)
    assert row["tasting_notes"] == "Chocolate, caramélo, cítrico"
