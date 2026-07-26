import pytest
from room.models import Room, ModelType
from accounts.models import User
from message.models import Message, MessageRead
from django.db import IntegrityError, transaction

pytestmark = pytest.mark.django_db


@pytest.fixture
def user():
    user = User.objects.create_user(username="test", password="@test12345678")
    return user


@pytest.fixture
def profile(user):
    return user.user_profile


@pytest.fixture
def create_room(profile):
    room = Room.objects.create(
        creator=profile, name="test", model=ModelType.pv.value
    )
    room.participants.add(profile)
    return room


def test_create_message(profile, create_room):
    # Act
    message = Message.objects.create(
        sender=profile, text="test", room=create_room
    )
    message.refresh_from_db()
    # Assert
    assert message.text == "test"
    assert message.sender == profile
    assert message.created_date is not None


def test_edit_message(profile, create_room):
    # Arrange
    message = Message.objects.create(
        sender=profile, text="test", room=create_room
    )
    # Act
    message_updated_date = message.updated_date
    message.text = "test_edit"
    message.save()
    message.refresh_from_db()
    # Assert
    assert message.text == "test_edit"
    assert message.updated_date != message_updated_date


def test_create_message_read(profile, create_room):
    # Arrange
    message = Message.objects.create(
        sender=profile, text="test", room=create_room
    )
    # Act
    message_read = MessageRead.objects.create(message=message, user=profile)
    message_read.refresh_from_db()
    # Assert
    assert message_read.message.text == "test"


def test_message_read_duplicate(profile, create_room):
    # Arrange
    message = Message.objects.create(
        sender=profile, text="test", room=create_room
    )
    MessageRead.objects.create(message=message, user=profile)
    # Duplicate
    with pytest.raises(IntegrityError):
        MessageRead.objects.create(message=message, user=profile)


def test_cannot_create_message_without_required_fields(profile, create_room):

    # Missing sender
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            Message.objects.create(text="test", room=create_room)

    # Missing room
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            Message.objects.create(sender=profile, text="test")
