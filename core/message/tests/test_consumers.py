import pytest
from rest_framework.test import APIClient
from channels.testing import WebsocketCommunicator
from accounts.models import User 
from core.asgi import application
from message.models import Message , MessageRead
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

@pytest.fixture
def message(profile,room):
    return Message.objects.create(sender = profile , text = 'test',room=room)

@pytest.fixture
def communicator(access_token,room):
    return WebsocketCommunicator(
            application,
            f"/ws/room/{room.pk}/?token={access_token}",
        )

async def test_send_message_creates_message(room,communicator):
   

    connected, _ = await communicator.connect()

    assert connected

    await communicator.send_json_to(
        {
            "type": "message",
            "message": "Hello"
        }
    )
    #ignore presence event
    await communicator.receive_json_from()
    response  =  await communicator.receive_json_from()

    assert response["message"] == "Hello"

    assert await Message.objects.filter(
        room=room,
        text="Hello"
    ).aexists()

    
    await communicator.disconnect()




async def test_authenticated_user_can_connect(communicator):
    connected, _ = await communicator.connect()

    assert connected is True
    await communicator.disconnect()



async def test_non_participant_cannot_connect(room, another_user_token):
    communicator = WebsocketCommunicator(
        application,
        f"/ws/room/{room.pk}/?token={another_user_token}",
    )

    try:
        connected, _ = await communicator.connect()
        assert not connected
    finally:
        await communicator.disconnect()



async def test_send_message_edit_message(communicator,message):
    connected, _ = await communicator.connect()
    
    assert connected
    
    await communicator.send_json_to(
            {
                "type": "message_edit",
                "message": "edited",
                "message_id": message.id
            }
        )

    #ignore presence event
    await communicator.receive_json_from()
    response  =  await communicator.receive_json_from()
    
    assert response["message"] == "edited"
    
    assert await Message.objects.filter(
            id=message.id,
            text="edited"
        ).aexists()
    
        
    await communicator.disconnect()

async def test_send_message_delete_message(communicator,message):
    connected, _ = await communicator.connect()
    
    assert connected
    
    await communicator.send_json_to(
            {
                "type": "message_delete",
                "message_ids": [message.id,]
            }
        )
    #ignore presence event
    await communicator.receive_json_from()
    response  =  await communicator.receive_json_from()
    
    assert response["message_ids"] == [message.id,]
    
    assert not await Message.objects.filter(
            id=message.id,
        ).aexists()
    
        
    await communicator.disconnect()

async def test_send_message_read(communicator,message):
    connected, _ = await communicator.connect()
    
    assert connected
    
    await communicator.send_json_to(
            {
                "type": "read",
                "message_ids": [message.id,]
            }
        )
    #ignore presence event
    await communicator.receive_json_from()
    response  =  await communicator.receive_json_from()
    
    assert response["message_ids"] == [message.id,]
    
    assert await MessageRead.objects.filter(
            message=message
        ).aexists()
    
        
    await communicator.disconnect()


async def test_reconnect_after_disconnect(communicator,room,access_token):
    connected, _ = await communicator.connect()
    
    assert connected is True
    await communicator.disconnect()

    communicator = WebsocketCommunicator(
        application,
        f"/ws/room/{room.pk}/?token={access_token}",
    )
    reconnect, _ = await communicator.connect()
    assert reconnect is True
    await communicator.disconnect()
    