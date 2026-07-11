from rest_framework.generics import ListAPIView , CreateAPIView , UpdateAPIView , DestroyAPIView , GenericAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework import status
from .serializers import MessageListSerializer , MessageCreateSerializer  , MessageUpdateSerializer , MessageReadSerializer
from message.models import Message , MessageRead
from .pagination import MessagePagination
from django.shortcuts import get_object_or_404
from room.models import Room , ModelType

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

class MessageUpdateApiView(UpdateAPIView):
    http_method_names = ['patch']
    permission_classes = [IsAuthenticated]
    serializer_class = MessageUpdateSerializer

    def get_queryset(self):
        return Message.objects.filter(id = self.kwargs['pk'],sender = self.request.user.pk)


    

class MessageDeleteApiView(DestroyAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Message.objects.select_related("room").filter(
            room_id=self.kwargs["room_id"]
        ).only(    "id",
            "sender_id",
            "room__creator_id",
            "room__model",)

    def get_object(self):
        message = super().get_object()

        user_pk = self.request.user.pk

        if (
            message.room.model == ModelType.pv.value
            and message.sender_id != user_pk
        ):
            raise PermissionDenied()

        if (
            message.sender_id != user_pk
            and message.room.creator_id != user_pk
        ):
            raise PermissionDenied()

        return message