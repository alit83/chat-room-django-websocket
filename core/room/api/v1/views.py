from rest_framework.generics import ListAPIView , CreateAPIView , UpdateAPIView , DestroyAPIView , RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from .serializers import RoomListSerializer , RoomCreateSerializer , RoomUpdateSerializer , RoomDetailSerializer
from room.models import Room
from accounts.models import Profile
from .permissions import IsRoomCreator
from django.db.models import Subquery , OuterRef

class RoomListApiView(ListAPIView):
    serializer_class = RoomListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset =  Room.objects.filter(participants = self.request.user.pk).prefetch_related("participants")
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
    
class RoomDeleteApiView(DestroyAPIView):
    permission_classes = [IsAuthenticated , IsRoomCreator]
    queryset =  Room.objects.all()

class RoomDetailApiView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = RoomDetailSerializer

    def get_queryset(self):

        return Room.objects.filter(participants = self.request.user.pk).prefetch_related('participants')
    