"""Tests for public shop (tienda pública) feature."""
from app.models.user import User


def test_user_has_shop_fields():
    columns = {c.name for c in User.__table__.columns}
    assert "roastery_slug" in columns
    assert "whatsapp_number" in columns
    assert "shop_theme" in columns


def test_roastery_slug_is_unique():
    slug_col = next(c for c in User.__table__.columns if c.name == "roastery_slug")
    assert slug_col.unique


def test_user_has_shop_theme():
    columns = {c.name for c in User.__table__.columns}
    assert "shop_theme" in columns


def test_make_roastery_slug_basic():
    from app.routes.auth import _make_roastery_slug
    slug = _make_roastery_slug("El Molino del Sur")
    assert slug.startswith("el-molino-del-sur-")
    assert len(slug) == len("el-molino-del-sur-") + 6


def test_make_roastery_slug_accents():
    from app.routes.auth import _make_roastery_slug
    slug = _make_roastery_slug("Café Ñoño")
    assert "-" in slug
    assert slug == slug.lower()
    assert " " not in slug


def test_make_roastery_slug_empty_name():
    from app.routes.auth import _make_roastery_slug
    slug = _make_roastery_slug("!@#$%")
    assert slug.startswith("tostadora-")


def test_business_profile_schemas_have_shop_fields():
    from app.schemas.document import BusinessProfileOut, BusinessProfileUpdate
    assert "roastery_slug" in BusinessProfileOut.model_fields
    assert "whatsapp_number" in BusinessProfileOut.model_fields
    assert "roastery_slug" in BusinessProfileUpdate.model_fields
    assert "whatsapp_number" in BusinessProfileUpdate.model_fields


def test_shop_public_schema_has_required_fields():
    from app.routes.shop import ShopPublic, ShopProduct
    fields = ShopPublic.model_fields
    assert "roastery_name" in fields
    assert "roastery_slug" in fields
    assert "products" in fields
    assert "whatsapp_number" in fields
    assert "theme" in fields

    product_fields = ShopProduct.model_fields
    assert "name" in product_fields
    assert "price" in product_fields
    assert "stock_quantity" in product_fields
    assert "sku" not in product_fields


def test_shop_theme_defaults():
    from app.schemas.shop import ShopTheme
    t = ShopTheme()
    assert t.primary_color == "#92400e"
    assert t.layout == "list"
    assert t.font_family == "sans"


def test_shop_theme_hex_validation():
    import pytest
    from pydantic import ValidationError
    from app.schemas.shop import ShopTheme
    with pytest.raises(ValidationError):
        ShopTheme(primary_color="red")
    with pytest.raises(ValidationError):
        ShopTheme(primary_color="#gggggg")


def test_shop_theme_about_text_max():
    import pytest
    from pydantic import ValidationError
    from app.schemas.shop import ShopTheme
    with pytest.raises(ValidationError):
        ShopTheme(about_text="x" * 501)


def test_shop_theme_partial_override():
    from app.schemas.shop import ShopTheme
    t = ShopTheme(primary_color="#ff0000")
    assert t.primary_color == "#ff0000"
    assert t.accent_color == "#d97706"


def test_shop_public_has_theme():
    from app.routes.shop import ShopPublic
    assert "theme" in ShopPublic.model_fields
