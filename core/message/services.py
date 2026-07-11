from message.models import Message , MessageRead
from channels.db import database_sync_to_async
from rest_framework.exceptions import ValidationError
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