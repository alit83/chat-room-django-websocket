from rest_framework.generics import (
    ListAPIView,
    CreateAPIView,
    UpdateAPIView,
    DestroyAPIView,
    RetrieveAPIView,
)
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .serializers import (
    RoomCreateSerializer,
    RoomUpdateSerializer,
    RoomDetailSerializer,
    RoomLinkSerializer,
)
from rest_framework.response import Response
from rest_framework import status
from room.models import Room, ModelType
from .permissions import IsRoomCreator
from django.shortcuts import get_object_or_404
from django.core.cache import cache


class RoomListApiView(ListAPIView):

    permission_classes = [IsAuthenticated]
    ROOM_META_TTL = 60 * 60 * 24  # 24 hours

    def get_queryset(self):

        return (
            Room.objects.filter(participants=self.request.user.pk)
            .select_related("last_message", "creator")
            .prefetch_related("participants__user")
            .order_by("-last_message__created_date")
        )

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        user = request.user
        keys = [f"room:{room.pk}:meta" for room in queryset]
        cached = cache.get_many(keys)

        response = []
        missing = {}
        for room in queryset:
            key = f"room:{room.pk}:meta"

            meta = cached.get(key)

            if meta is None:
                meta = self.build_meta(room, user)

                missing[key] = meta

            last_msg = room.last_message
            response.append(
                {
                    **meta,
                    "last_message": last_msg.text if last_msg else None,
                    "last_message_at": (
                        last_msg.created_date if last_msg else None
                    ),
                }
            )
        if missing:
            cache.set_many(missing, self.ROOM_META_TTL)

        return Response(response)

    def build_meta(self, room, user):

        return {
            "id": room.id,
            "name": room.get_display_name(user),
            "link": room.link,
            "model": room.model,
            "created_date": room.created_date,
            "updated_date": room.updated_date,
            "profile": room.profile.url if room.profile else None,
            "creator": room.creator.pk,
            "pv_avatar": room.get_pv_avatar(user),
            "participants": [{"id": p.pk} for p in room.participants.all()],
        }


class RoomCreateApiView(CreateAPIView):
    serializer_class = RoomCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):

        serializer.save(creator=self.request.user.user_profile)


class RoomUpdateApiView(UpdateAPIView):
    http_method_names = ["patch"]
    serializer_class = RoomUpdateSerializer
    permission_classes = [IsAuthenticated, IsRoomCreator]
    queryset = Room.objects.only(
        "id",
        "creator",
        "model",
        "name",
        "link",
        "profile",
    ).select_related("creator")


class RoomDeleteApiView(DestroyAPIView):
    permission_classes = [IsAuthenticated, IsRoomCreator]
    queryset = Room.objects.all()


class RoomDetailApiView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = RoomDetailSerializer

    def get_queryset(self):

        return Room.objects.filter(
            participants=self.request.user.pk
        ).prefetch_related("participants")


class RoomLinkApiView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, link, *args, **kwargs):

        room_obj = get_object_or_404(Room, link=link)
        serializer = RoomLinkSerializer(room_obj, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, link, *args, **kwargs):

        room_obj = get_object_or_404(
            Room.objects.prefetch_related("participants"), link=link
        )

        if room_obj.model == ModelType.group_private.value:
            return Response(
                {"error": "joining on private group not permitted"},
                status=status.HTTP_403_FORBIDDEN,
            )

        profile = request.user.user_profile

        if not room_obj.participants.filter(pk=profile.pk).exists():
            room_obj.participants.add(profile)

        serializer = RoomDetailSerializer(room_obj)
        return Response(serializer.data, status=status.HTTP_200_OK)
