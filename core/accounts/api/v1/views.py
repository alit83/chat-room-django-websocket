from rest_framework import generics , status
from rest_framework.throttling import UserRateThrottle
from rest_framework.response import Response
from .serializers import SignUpApiSerializer , CustomeTokenObtainPairSerializer , ProfileSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from accounts.models import  Profile
from rest_framework.permissions import IsAuthenticated

class SignUpApiView(generics.GenericAPIView):
    serializer_class = SignUpApiSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_obj = serializer.save()
        email = user_obj.username
        data = {"email": email}

        return Response(data, status=status.HTTP_201_CREATED)
    

class LoginApiView(TokenObtainPairView):
    throttle_classes = [UserRateThrottle]
    serializer_class = CustomeTokenObtainPairSerializer

class ProfileDetailsApiView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProfileSerializer

    def get_object(self):
        return (
        Profile.objects
        .only("first_name", "last_name", "gender",'avatar')
        .get(user=self.request.user)
    )
