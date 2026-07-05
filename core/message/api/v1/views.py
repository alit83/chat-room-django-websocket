from rest_framework.generics import ListAPIView , CreateAPIView , UpdateAPIView , DestroyAPIView
from rest_framework.permissions import IsAuthenticated
from .serializers import MessageListSerializer , MessageCreateSerializer
from message.models import Message
from .pagination import MessagePagination
from django.shortcuts import get_object_or_404
from room.models import Room

class MessageListApiView(ListAPIView):
    serializer_class = MessageListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = MessagePagination

    def get_queryset(self):
        queryset =  Message.objects.filter(room_id = self.kwargs['pk'],room__participants = self.request.user.pk).select_related("sender").order_by("-created_date")
        return queryset


class MessageCreateApiView(CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageCreateSerializer

    
    def perform_create(self, serializer):
        
        room_obj = get_object_or_404(Room.objects.filter(participants = self.request.user.pk),pk = self.kwargs['pk'])

        serializer.save(
            sender = self.request.user.user_profile,
            room = room_obj
        )