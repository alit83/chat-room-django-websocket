from rest_framework.generics import ListAPIView , CreateAPIView
from rest_framework.permissions import IsAuthenticated
from .serializers import RoomListSerializer , RoomCreateSerializer
from room.models import Room

class RoomListApiView(ListAPIView):
    serializer_class = RoomListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset =  Room.objects.filter(participant = self.request.user.pk).prefetch_related("participant")
        return queryset

class RoomCreateApiView(CreateAPIView):
    serializer_class = RoomCreateSerializer
    permission_classes = [IsAuthenticated]


    def perform_create(self, serializer):
        
        serializer.save(
            creator = self.request.user.user_profile
        )