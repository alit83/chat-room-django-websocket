import pytest
from room.models import Room , ModelType
from accounts.models import User 
from message.models import Message , MessageRead
from message.api.v1.serializers import MessageListSerializer ,  MessageReadSerializer

pytestmark = pytest.mark.django_db


@pytest.fixture
def user():
    user = User.objects.create_user(username='test',password='@test12345678')
    return user
@pytest.fixture
def profile(user):
    return user.user_profile

@pytest.fixture
def create_room(profile):
    room = Room.objects.create(creator=profile,name='test',model =ModelType.pv.value)
    room.participants.add(profile)
    return room

def test_message_serializer_without_read(profile,create_room):
    # Arrange
    message = Message.objects.create(sender = profile , text = 'test',room=create_room)
    # Act
    serializer = MessageListSerializer(message)
    # Assert
    assert serializer.data["text"] == 'test'
    assert serializer.data["room"] == create_room.pk
    assert serializer.data["sender"]["username"] == profile.user.username
    assert serializer.data["read_by"] == []

def test_message_serializer_with_read(profile,create_room):
    # Arrange
    message = Message.objects.create(sender = profile , text = 'test',room=create_room)
    MessageRead.objects.create(message=message,user=profile)
    # Act
    serializer = MessageListSerializer(message)
    # Assert
    assert serializer.data["text"] == 'test'
    assert serializer.data["room"] == create_room.pk
    assert serializer.data["sender"]["username"] == profile.user.username
    assert serializer.data["read_by"][0]["user"] == profile.pk

def test_message_read_serializer(profile,create_room):
    # Arrange
    message = Message.objects.create(sender = profile , text = 'test',room=create_room)
    message_read = MessageRead.objects.create(message=message,user=profile)
    # Act
    serializer = MessageReadSerializer(message_read)
    # Assert
    assert serializer.data["user"] == profile.pk
