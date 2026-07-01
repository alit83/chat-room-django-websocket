from django.urls import path
from . import views


urlpatterns=[
    path('room-list/',views.RoomListApiView.as_view(),name='room_list'),

]