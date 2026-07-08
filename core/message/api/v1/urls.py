from django.urls import path
from . import views


urlpatterns=[
     path('room/<int:pk>/message-list/',views.MessageListApiView.as_view(),name='message_list'),
     path('room/<int:pk>/message-create/',views.MessageCreateApiView.as_view(),name='message_create'),
     path('room/<int:room_id>/message-delete/<int:pk>/',views.MessageDeleteApiView.as_view(),name='message_delete'),
     path('<int:pk>/message-update/',views.MessageUpdateApiView.as_view(),name='message-update'),
     path('room/<int:room_id>/read-message/',views.MessageReadApiView.as_view(),name='message-read')
]