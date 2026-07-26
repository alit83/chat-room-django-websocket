import pytest
from rest_framework.test import APIClient
from channels.testing import WebsocketCommunicator
from accounts.models import User
from core.asgi import application
from room.models import Room, ModelType
from django.urls import reverse
from core.redis import redis

pytestmark = [
    pytest.mark.django_db(transaction=True),
    pytest.mark.asyncio,
]


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
        creator=profile, name="test", model=ModelType.pv.value
    )
    room.participants.add(profile)
    return room


@pytest.fixture
def access_token(user, api_client):
    data = {"username": user.username, "password": "@test12345678"}
    url = reverse("accounts:api-v1:login")
    response = api_client.post(url, data)
    return response.data["access"]


async def test_connection_closed_after_invalid_token(room):
    communicator = WebsocketCommunicator(
        application,
        f"/ws/room/{room.pk}/?token={'invalid'}",
    )
    try:
        connected, _ = await communicator.connect()
        assert not connected
    finally:
        if connected:
            await communicator.disconnect()


async def test_presence_updates_after_connect(access_token, room, user):
    communicator = WebsocketCommunicator(
        application,
        f"/ws/room/{room.pk}/?token={access_token}",
    )

    connected, _ = await communicator.connect()
    assert connected
    assert await redis.get(f"user:{user.pk}:connections") == "1"
    await communicator.disconnect()
