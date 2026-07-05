from rest_framework.generics import ListAPIView , CreateAPIView , UpdateAPIView , DestroyAPIView , RetrieveAPIView
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .serializers import RoomListSerializer , RoomCreateSerializer , RoomUpdateSerializer , RoomDetailSerializer , RoomLinkSerializer
from rest_framework.response import Response
from rest_framework import status
from room.models import Room ,ModelType
from .permissions import IsRoomCreator
from django.shortcuts import get_object_or_404


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
    

class RoomLinkApiView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self,request,link,*args,**kwargs):
        
        room_obj = get_object_or_404(Room,link=link)
        serializer = RoomLinkSerializer(room_obj,context={'request':request})
        return Response(serializer.data,status=status.HTTP_200_OK)
    
    def post(self,request,link,*args,**kwargs):

        room_obj = get_object_or_404(Room.objects.prefetch_related("participants"),link=link)
        
        if room_obj.model == ModelType.group_private.value:
            return Response({'error':'joining on private group not permitted'},status=status.HTTP_403_FORBIDDEN)
        
        profile = request.user.user_profile

        if not room_obj.participants.filter(pk=profile.pk).exists():
            room_obj.participants.add(profile)

        serializer = RoomDetailSerializer(room_obj)
        return Response(serializer.data,status=status.HTTP_200_OK)
