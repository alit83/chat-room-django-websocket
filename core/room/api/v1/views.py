from rest_framework.generics import ListAPIView , CreateAPIView , UpdateAPIView
from rest_framework.permissions import IsAuthenticated
from .serializers import RoomListSerializer , RoomCreateSerializer , RoomUpdateSerializer
from room.models import Room
from .permissions import IsRoomCreator

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

class RoomUpdateApiView(UpdateAPIView):
    http_method_names = ['patch']
    serializer_class = RoomUpdateSerializer
    permission_classes = [IsAuthenticated , IsRoomCreator]
    queryset = (
    Room.objects
    .only(
        "id",
        "creator",
        "model",
        "name",
        "link",
        "profile",
    )
    .select_related("creator")
)