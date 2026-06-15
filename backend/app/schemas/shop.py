"""Shop theme schema with hex color validation."""
import re
from typing import Literal, Optional

from pydantic import BaseModel, field_validator

HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


class ShopTheme(BaseModel):
    primary_color: str = "#92400e"
    accent_color: str = "#d97706"
    bg_color: str = "#fafaf9"
    text_color: str = "#1c1917"
    font_family: Literal["sans", "serif", "mono"] = "sans"
    layout: Literal["list", "grid"] = "list"
    about_text: Optional[str] = None
    banner_image: Optional[str] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None

    @field_validator("primary_color", "accent_color", "bg_color", "text_color")
    @classmethod
    def must_be_hex(cls, v: str) -> str:
        if not HEX_RE.match(v):
            raise ValueError(f"'{v}' is not a valid hex color (#rrggbb)")
        return v

    @field_validator("about_text")
    @classmethod
    def max_500_chars(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) > 500:
            raise ValueError("about_text must be 500 characters or fewer")
        return v

    model_config = {"extra": "ignore"}
