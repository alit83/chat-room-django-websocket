import pytest
from rest_framework.test import APIClient
from room.models import Room , ModelType
from accounts.models import User 
from message.models import Message , MessageRead
from django.db import IntegrityError , transaction
pytestmark = pytest.mark.django_db

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
def create_room(profile):
    room = Room.objects.create(creator=profile,name='test',model =ModelType.pv.value)
    room.participants.add(profile)
    return room



