from django.urls import path
from . import views
from rest_framework_simplejwt.views import (
    TokenVerifyView,TokenRefreshView
)

urlpatterns=[
    path('registration/',views.SignUpApiView.as_view(),name='registration'),
    path('login/',views.LoginApiView.as_view(),name='login'),
    path('jwt/refresh-token/',TokenRefreshView.as_view(),name='refresh_token'),
    path('jwt/token-verification/',TokenVerifyView.as_view(),name='token_verification'),
    path('profile/details/',views.ProfileDetailsApiView.as_view(),name='profile_details')
]