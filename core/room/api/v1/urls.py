from django.urls import path
from . import views


urlpatterns=[
    path('room-list/',views.RoomListApiView.as_view(),name='room_list'),
    path('room-create/',views.RoomCreateApiView.as_view(),name='room_create'),
    path('room-update/<int:pk>/',views.RoomUpdateApiView.as_view(),name='room_update'),
]