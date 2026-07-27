from django.urls import path
from . import views

app_name = 'api-v1'

urlpatterns=[
     path('room/<int:pk>/message-list/',views.MessageListApiView.as_view(),name='message-list'),

]