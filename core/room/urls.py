from django.urls import include , path

app_name ='rooms'

urlpatterns=[
    path("api/v1/", include("room.api.v1.urls")),
]