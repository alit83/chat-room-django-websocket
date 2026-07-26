import pytest
from rest_framework.test import APIClient
from room.models import Room, ModelType
from accounts.models import User
from django.urls import reverse

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    clinet = APIClient()
    return clinet


@pytest.fixture
def user():
    user = User.objects.create_user(username="test", password="@test12345678")
    return user


@pytest.fixture
def profile(user):
    return user.user_profile


@pytest.fixture
def room(profile):
    room = Room.objects.create(
        creator=profile,
        model=ModelType.group_public.value,
        link="test",
        name="test",
    )
    room.participants.add(profile)
    return room


@pytest.fixture
def access_token(user, api_client):
    data = {"username": user.username, "password": "@test12345678"}
    url = reverse("accounts:api-v1:login")
    response = api_client.post(url, data)
    return response.data["access"]


@pytest.fixture
def another_user_profile():
    user = User.objects.create_user(username="test2", password="@test12345678")
    return user.user_profile


@pytest.fixture
def another_user_token(api_client, another_user_profile):
    data = {
        "username": another_user_profile.user.username,
        "password": "@test12345678",
    }
    url = reverse("accounts:api-v1:login")
    response = api_client.post(url, data)
    return response.data["access"]


def test_get_room_list_response_200(access_token, room, profile, api_client):
    url = reverse("rooms:api-v1:room-list")
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
    response = api_client.get(url)
    assert response.status_code == 200
    assert response.data[0]["creator"] == profile.pk
    assert response.data[0]["id"] == room.id


def test_create_room_response_201(access_token, profile, api_client):
    url = reverse("rooms:api-v1:room-create")
    data = {
        "name": "test",
        "link": "test",
        "model": ModelType.group_public.value,
        "participants": [
            profile.pk,
        ],
    }
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
    response = api_client.post(url, data)
    assert response.status_code == 201
    assert response.data["name"] == "test"
    assert Room.objects.filter(name="test", creator=profile.pk).exists()


def test_join_room_with_link_response_200(
    another_user_token, room, api_client, another_user_profile
):
    url = reverse("rooms:api-v1:room-link", kwargs={"link": room.link})
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {another_user_token}")
    response = api_client.post(url)
    assert response.status_code == 200
    room.refresh_from_db()
    assert another_user_profile in room.participants.all()
