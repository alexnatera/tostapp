"""Unit tests for _make_slug."""
from datetime import date

from app.routes.roasts import _make_slug


def test_make_slug_basic():
    slug = _make_slug("Huila, Colombia", date(2024, 1, 15))
    assert slug.startswith("huila-colombia-20240115-")
    assert len(slug.split("-")[-1]) == 6


def test_make_slug_with_accents():
    slug = _make_slug("Ñuble, José — Perú", date(2024, 3, 1))
    # Accented chars should be transliterated, not dropped
    assert "20240301" in slug
    assert slug == slug.lower()
    assert not slug.startswith("-")


def test_make_slug_non_latin_fallback():
    # Non-Latin input (e.g. Arabic) should produce "roast" as base
    slug = _make_slug("قهوة", date(2024, 6, 1))
    assert slug.startswith("roast-20240601-")


def test_make_slug_is_unique():
    d = date(2024, 1, 1)
    slugs = {_make_slug("Ethiopia", d) for _ in range(20)}
    # All 20 should be unique (uuid4 hex suffix)
    assert len(slugs) == 20
