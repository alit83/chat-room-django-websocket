import pytest
from room.models import Room, ModelType
from accounts.models import User
from room.api.v1.serializers import RoomUpdateSerializer

pytestmark = pytest.mark.django_db


@pytest.fixture
def user():
    user = User.objects.create_user(username="test", password="@test12345678")
    return user


@pytest.fixture
def profile(user):
    return user.user_profile


@pytest.fixture
def room(profile):
    room = Room.objects.create(creator=profile, model=ModelType.pv.value)
    room.participants.add(profile)
    return room


def test_pv_room_more_than_2_participant_get_fails(profile, room):
    participant2 = User.objects.create_user(
        username="participant2", password="@test12345678"
    )
    participant3 = User.objects.create_user(
        username="participant3", password="@test12345678"
    )
    serializer = RoomUpdateSerializer(
        instance=room,
        data={
            "participants": [
                profile.pk,
                participant2.user_profile.pk,
                participant3.user_profile.pk,
            ]
        },
    )

    assert serializer.is_valid() is False


def test_creator_not_in_participant_get_fails(profile):
    room = Room.objects.create(creator=profile, model=ModelType.pv.value)
    serializer = RoomUpdateSerializer(data=room)
    assert serializer.is_valid() is False
