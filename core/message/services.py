from message.models import Message , MessageRead
from channels.db import database_sync_to_async
from rest_framework.exceptions import ValidationError
from core.redis import redis
from room.models import Room
from django.db.models import Q

class MessageService:

    @staticmethod
    async def create_message(*, user, room, text):
        return await Message.objects.acreate(
            sender_id=user.pk,
            room=room,
            text=text.strip(),
        )
    
    @staticmethod
    async def edit_message(*,user_id,message_id,new_message):
        try:
            message_obj = await Message.objects.aget(id=message_id,sender_id=user_id)
        except Message.DoesNotExist:
            return None
        message_obj.text = new_message.strip()
        await message_obj.asave(update_fields=['text'])
        return message_obj
    

    @staticmethod
    @database_sync_to_async   
    def delete_messages(*,message_ids,room,user_pk):
        messages = Message.objects.filter(Q(room=room) & Q(id__in=message_ids) & (Q(sender_id=user_pk) | Q(room__creator_id=user_pk))).only("id")
        if messages.count() != len(message_ids):
            raise ValidationError(
            {"message_ids": ["Some messages are invalid for deletion."]}
            )
        messages.delete()

            


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
        PRESENCE_TTL=60
        key = f"user:{user_id}:connections"
        connetions = await redis.incr(key)
        await redis.expire(
    key,
    PRESENCE_TTL,
)   
        return connetions

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
    @staticmethod
    async def heartbeat(*,user_id):
        PRESENCE_TTL=60
        await redis.expire(
        f"user:{user_id}:connections",
        PRESENCE_TTL,
    )