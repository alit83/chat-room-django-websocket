import pytest
from rest_framework.test import APIClient
from room.models import Room , ModelType
from accounts.models import User 
from message.models import Message 
from django.db import IntegrityError , transaction
from django.urls import reverse
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
def room(profile):
    room = Room.objects.create(creator=profile,name='test',model =ModelType.pv.value)
    room.participants.add(profile)
    return room

@pytest.fixture
def take_token(user, api_client):
    data = {"username": user.username, "password": "@test12345678"}
    url = reverse("accounts:api-v1:login")
    response = api_client.post(url, data)
    return response.data

@pytest.fixture
def message(profile,room):
       message = Message.objects.create(sender = profile , text = 'test',room=room)
       return message

def test_get_all_message_anonymous_response_401(api_client,room):
      url = reverse("messages:api-v1:message-list", kwargs={"pk":room.id})
      client = api_client
      response = client.get(url)
      assert response.status_code == 401

def test_get_all_message_successful_response_200(api_client,room,take_token,message):
      url = reverse("messages:api-v1:message-list", kwargs={"pk":room.id})
      access = take_token["access"]
      api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
      response = api_client.get(url)
      assert response.status_code == 200
      assert response.data['results'][0]['text'] == "test"