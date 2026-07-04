from django.urls import path
from . import views


urlpatterns=[
     path('room/<int:pk>/message-list/',views.MessageListApiView.as_view(),name='message_list'),
]