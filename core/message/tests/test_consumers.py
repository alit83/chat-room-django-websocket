import pytest
from rest_framework.test import APIClient
from channels.testing import WebsocketCommunicator
from channels.routing import URLRouter
from accounts.models import User 
from core.asgi import application
from message.models import Message
from room.models import Room , ModelType
from django.urls import reverse
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
    user = User.objects.create_user(username='test',password='@test12345678')
    return user
@pytest.fixture
def profile(user):
    return user.user_profile

@pytest.fixture
def room(profile):
    room = Room.objects.create(creator=profile,name='test',model =ModelType.pv.value)
    room.participants.add(profile)
    return room

@pytest.fixture
def access_token(user, api_client):
    data = {"username": user.username, "password": "@test12345678"}
    url = reverse("accounts:api-v1:login")
    response = api_client.post(url, data)
    return response.data["access"]
@pytest.fixture
def another_user_token(api_client):
    User.objects.create_user(username='test2',password='@test12345678')
    data = {"username": "test2" , "password": "@test12345678"}
    url = reverse("accounts:api-v1:login")
    response = api_client.post(url, data)
    return response.data["access"]

async def test_authenticated_user_can_connect(room, access_token):
    communicator = WebsocketCommunicator(
        application,
        f"/ws/room/{room.pk}/?token={access_token}",
    )

    connected, _ = await communicator.connect()

    assert connected is True

    await communicator.disconnect()


async def test_non_participant_cannot_connect(room, another_user_token):
    communicator = WebsocketCommunicator(
        application,
        f"/ws/room/{room.pk}/?token={another_user_token}",
    )

    connected, _ = await communicator.connect()

    assert connected is False
    await communicator.disconnect()

async def test_send_message_creates_message(room,access_token):
    communicator = WebsocketCommunicator(
        application,
        f"/ws/room/{room.pk}/?token={access_token}",
    )

    connected, _ = await communicator.connect()

    assert connected

    await communicator.send_json_to(
        {
            "type": "message",
            "message": "Hello"
        }
    )

    _ = await communicator.receive_json_from()
    response        =  await communicator.receive_json_from()

    assert response["message"] == "Hello"

    assert await Message.objects.filter(
        room=room,
        text="Hello"
    ).aexists()

    await communicator.disconnect()