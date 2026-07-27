from django.urls import include , path

app_name ='messages'

urlpatterns=[
    path("api/v1/", include("message.api.v1.urls")),
]