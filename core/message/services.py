from message.models import Message

class MessageService:

    @staticmethod
    async def create_message(*, user, room, text):
        return await Message.objects.acreate(
            sender_id=user.pk,
            room=room,
            text=text,
        )