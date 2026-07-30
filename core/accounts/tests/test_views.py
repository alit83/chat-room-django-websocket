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

def test_sign_up_response_201(api_client):
    data = {"username": 'test', "password": "@test12345678","password1":"@test12345678"}
    url = reverse("accounts:api-v1:registration")
    response = api_client.post(url,data)
    assert response.data['username']  == 'test'
    assert response.status_code == 201
    assert User.objects.filter(username='test').exists()
def test_login_response_200(api_client):
    user = User.objects.create_user(username='test',password="@test12345678")
    data = {"username": user.username, "password": "@test12345678"}
    url = reverse("accounts:api-v1:login")
    response = api_client.post(url,data)
    assert response.status_code == 200
        
def test_get_profile_detail_anonymous_response_401(profile,api_client):    
    url = reverse("accounts:api-v1:profile_details")
    response = api_client.get(url)
    assert response.status_code == 401