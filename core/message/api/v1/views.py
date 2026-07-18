from rest_framework.generics import ListAPIView 
from rest_framework.permissions import IsAuthenticated
from .serializers import MessageListSerializer
from message.models import Message 
from .pagination import MessagePagination


class MessageListApiView(ListAPIView):
    serializer_class = MessageListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = MessagePagination

    def get_queryset(self):
        queryset =  Message.objects.filter(room_id = self.kwargs['pk'],room__participants = self.request.user.pk).select_related("sender").order_by("-created_date")
        return queryset

