from django.urls import path
from . import views

app_name = "api-v1"

urlpatterns = [
    path("room-list/", views.RoomListApiView.as_view(), name="room-list"),
    path(
        "room-create/", views.RoomCreateApiView.as_view(), name="room-create"
    ),
    path(
        "room-update/<int:pk>/",
        views.RoomUpdateApiView.as_view(),
        name="room-update",
    ),
    path(
        "room-delete/<int:pk>/",
        views.RoomDeleteApiView.as_view(),
        name="room-delete",
    ),
    path(
        "room-detail/<int:pk>/",
        views.RoomDetailApiView.as_view(),
        name="room-detail",
    ),
    path(
        "room/<slug:link>/link/",
        views.RoomLinkApiView.as_view(),
        name="room-link",
    ),
]
