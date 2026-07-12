from message.models import Message , MessageRead
from channels.db import database_sync_to_async
from rest_framework.exceptions import ValidationError
from core.redis import redis
from room.models import Room

class MessageService:

    @staticmethod
    async def create_message(*, user, room, text):
        return await Message.objects.acreate(
            sender_id=user.pk,
            room=room,
            text=text,
        )
    

    @staticmethod
    @database_sync_to_async   
    def read_messages(*,message_ids,room,user_pk):
        messages = Message.objects.filter(room = room , id__in = message_ids).only("id")
        if messages.count() != len(set(message_ids)):
            raise ValidationError(
            {"message_ids": ["Some messages are invalid."]}
            )
            

        existing = set(
    MessageRead.objects.filter(
        user_id=user_pk,
        message_id__in=messages,
    ).values_list("message_id", flat=True)
)
        new_ids = list(set(message_ids) - existing)
        reads = [
        MessageRead(
        user_id=user_pk,
        message_id=message_id,
    )
    
    for message_id in new_ids
]
        MessageRead.objects.bulk_create(
        reads
)
        return new_ids
    
class PresenceService():
    @staticmethod
    async def connect(*,user_id):
        return await redis.incr(f"user:{user_id}:connections")

    @staticmethod
    async def disconnect(*,user_id):
        connections = await redis.decr(f"user:{user_id}:connections")

        if connections <= 0:
            await redis.delete(f"user:{user_id}:connections")

        return max(connections, 0)

    @staticmethod
    @database_sync_to_async 
    def rooms_id(*,user_id):
        return  Room.objects.filter(
            participants=user_id
            ).values_list("id", flat=True)