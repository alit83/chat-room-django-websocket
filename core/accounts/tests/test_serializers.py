import pytest
from accounts.models import User
from accounts.api.v1.serializers import (
    SignUpApiSerializer,
)

pytestmark = pytest.mark.django_db


def test_sign_up_api_serializer_different_passwords():
    serializer = SignUpApiSerializer(
        data={
            "username": "testuser",
            "password": "@A12345678",
            "password1": "@A87654321",
        }
    )
    assert serializer.is_valid() is False


def test_sign_up_api_serializer_weak_password():
    serializer = SignUpApiSerializer(
        data={"username": "testuser", "password": "123", "password1": "123"}
    )
    assert not serializer.is_valid()
    assert "password" in serializer.errors


def test_sign_up_api_serializer_valid_values():
    serializer = SignUpApiSerializer(
        data={
            "username": "testuser",
            "password": "@A12345678",
            "password1": "@A12345678",
        }
    )
    assert serializer.is_valid()
    serializer.save()
    assert User.objects.filter(username="testuser").exists()
