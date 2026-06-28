from django.urls import path
from . import views


urlpatterns=[
    path('registration/',views.SignUpApiView.as_view(),name='registration'),
    path('login/',views.LoginApiView.as_view(),name='login')
]