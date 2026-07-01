from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from .serializers import RoomSerializers
from room.models import Room

class RoomListApiView(ListAPIView):
    serializer_class = RoomSerializers
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset =  Room.objects.filter(participant = self.request.user.pk).prefetch_related("participant")
        return queryset
