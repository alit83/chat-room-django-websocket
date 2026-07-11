from channels.generic.websocket import AsyncWebsocketConsumer
import json
from .services import MessageService
from room.models import Room
from message.api.v1.serializers import MessageReadSerializer
from rest_framework.exceptions import ValidationError




class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        self.room_id =  self.scope["url_route"]["kwargs"]["room_id"]
        self.room_group_name = f"room_{self.room_id}"
        if self.user.is_anonymous:
            await self.close(code=4001)
            return
        try:
            self.room = await Room.objects.aget(pk=self.room_id,participants = self.user.pk)
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name)
            await self.accept()
        except Room.DoesNotExist:
            await self.close(code=4004)
            return
    async def disconnect(self, close_code):

        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name)


    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "type":"message",
            "message":  event["message"],
            "room_id":event["room_id"],
            "sender_id": event["sender_id"],
            "message_id":event["message_id"]
        }))

    async def chat_typing(self,event):
        await self.send(
        text_data=json.dumps({
            "type": "typing",
            "room_id":event['room_id'],
            "user_id": event["user_id"],
            "is_typing": event["is_typing"],
        })
    )
    async def chat_read(self,event):
        await self.send(
        text_data=json.dumps({
            "type": "read",
            "room_id":event['room_id'],
            "user_id": event["user_id"],
            "message_ids": event["message_ids"],
        })
    )

    async def receive(self, text_data):
        data = json.loads(text_data)
        handlers = {
            "message":self.handle_message,
            "typing":self.handle_typing,
            "read":self.handle_read
        }
        handler = handlers.get(data.get("type"))
        if handler is None:

            await self.send(text_data=json.dumps({
                    'error':'type doesnt match between available type'
                }))
            return
        await handler(data)
    
    async def handle_message(self,data):
        text=data.get("message")
        if not text:
            await self.send(text_data=json.dumps({
                    'error':'Message is required'
                }))
            return
        message = await MessageService.create_message(
                user=self.user,
                room=self.room,
                text=text,)
        await self.channel_layer.group_send(self.room_group_name,{
            "type":"chat.message",
            "message":message.text,
            "sender_id":self.user.pk,
            "message_id":message.id,
            "room_id":self.room_id
            },)
    async def handle_typing(self,data):
        is_typing = data.get('is_typing')
        if not isinstance(is_typing, bool):
            await self.send(
        text_data=json.dumps({
            "error": "is_typing must be boolean."
        })
    )
            return
        await self.channel_layer.group_send(self.room_group_name,{
            "type":"chat.typing",
            "user_id":self.user.pk,
            "room_id":self.room_id,
            "is_typing":is_typing
            },)
    async def handle_read(self,data):
        serializer = MessageReadSerializer(data=data)
        if not serializer.is_valid():
            await self.send(
        text_data=json.dumps({
                "errors": serializer.errors
            }))
            return
        message_ids = serializer.validated_data['message_ids']
        try:
            read_messages = await MessageService.read_messages(message_ids=message_ids,
                                                room=self.room,
                                                user_pk=self.user.pk)
        except ValidationError as exc:
            await self.send(
        text_data=json.dumps({
            "errors": exc.detail,
        })
    )
            return
        if not read_messages:
            return
        await self.channel_layer.group_send(self.room_group_name,{
            "type":"chat.read",
            "user_id":self.user.pk,
            "room_id":self.room_id,
            "message_ids":read_messages
            },)
