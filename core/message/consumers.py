from channels.generic.websocket import AsyncWebsocketConsumer
import json
from message.models import Message
from room.models import Room



class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        self.room_id =  self.scope["url_route"]["kwargs"]["room_id"]
        self.room_group_name = f"room_{self.room_id}"
        if self.user.is_anonymous:
            await self.close(code=4001)
            return
        self.room = await Room.objects.aget(pk=self.room_id,participants = self.user.pk)
        try:
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
            'message':  event['message']
        }))

    async def receive(self, text_data):
        data = json.loads(text_data)
        message =await Message.objects.acreate(
        sender_id=self.user.pk,
        room=self.room,
        text=data["message"])
        await self.channel_layer.group_send(self.room_group_name,{
            "type":"chat.message",
            "message":message.text,
            "sender":self.user.pk,
            "id":message.id,
            "room_id":self.room_id
        },)