from app.models.user import User


def test_user_model_has_subscription_fields():
    columns = {c.name for c in User.__table__.columns}
    assert "is_active" in columns
    assert "plan_tier" in columns
    assert "subscription_expires_at" in columns
    assert "last_active_at" in columns


def test_user_defaults():
    u = User(email="x@x.com", hashed_password="h", roastery_name="Test")
    assert u.is_active is True
    assert u.plan_tier == "beta"
    assert u.subscription_expires_at is None
    assert u.last_active_at is None


def test_toggle_endpoint_response_model():
    from app.routes.admin import UserSummary
    fields = UserSummary.model_fields
    assert "is_active" in fields
    assert "plan_tier" in fields
    assert "last_active_at" in fields
    assert "subscription_expires_at" in fields


def test_plan_update_validates_tier():
    from app.routes.admin import PlanUpdate
    p = PlanUpdate(plan_tier="pro")
    assert p.plan_tier == "pro"
    p2 = PlanUpdate(plan_tier="enterprise", subscription_expires_at="2026-12-31")
    assert p2.subscription_expires_at == "2026-12-31"
