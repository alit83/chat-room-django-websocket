from rest_framework import generics , status
from rest_framework.response import Response
from .serializers import SignUpApiSerializer , CustomeTokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

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
    serializer_class = CustomeTokenObtainPairSerializer

