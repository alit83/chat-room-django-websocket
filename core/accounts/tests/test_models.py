import pytest
from accounts.models import User, Profile
from django.db import IntegrityError

pytestmark = pytest.mark.django_db


def test_create_superuser_successfully():
    super_user = User.objects.create_superuser(
        username="testsuperuser", password="@a12345678"
    )
    assert super_user.is_superuser
    assert super_user.username == "testsuperuser"


def test_create_superuser_unsuccessfully():
    with pytest.raises(ValueError):
        User.objects.create_superuser(
            username="testsuperuser", password="@a12345678", is_superuser=False
        )


def test_duplicate_profile_for_a_user():
    user = User.objects.create_user(username="test", password="@test12345678")
    with pytest.raises(IntegrityError):
        Profile.objects.create(user=user)
