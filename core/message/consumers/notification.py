from channels.generic.websocket import AsyncWebsocketConsumer
import json

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if self.user.is_anonymous:
            await self.close(code=4001)
            return
        #Every connection must join  on personal group , so they can hearing about notifications
        self.user_group_name = f"user_{self.user.pk}"
        await self.channel_layer.group_add(self.user_group_name , self.channel_name)
        await self.accept()
        
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.user_group_name,
            self.channel_name)
    async def receive(self, text_data):
        pass

    async def chat_notification(self,event):
        await self.send(text_data=json.dumps({
            "type": "room_notification",
            "room_id": event["room_id"],
            "message": event["message"],
            "sender_id": event["sender_id"],
            "sender_username": event["sender_username"],
            "sender_firstname": event.get("sender_firstname"),
            "sender_lastname": event.get("sender_lastname"),
            "message_id": event["message_id"],
            "created_at": event["created_at"],
        }))
