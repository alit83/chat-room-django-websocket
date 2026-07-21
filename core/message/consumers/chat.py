from channels.generic.websocket import AsyncWebsocketConsumer
import json
from ..services import MessageService , PresenceService
from room.models import Room
from message.api.v1.serializers import MessageIdsSerializer
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from accounts.models import Profile



class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        self.room_id =  self.scope["url_route"]["kwargs"]["room_id"]
        self.room_group_name = f"room_{self.room_id}"
        if self.user.is_anonymous:
            await self.close(code=4001)
            return
        try:
           # Verify the user belongs to the requested room while fetching it.
            self.room = await Room.objects.aget(pk=self.room_id,participants = self.user.pk)
            
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name)
            await self.accept()
           # A user may have multiple browser tabs open. We track the number of
           # active connections so the user is considered offline only after the
           # last WebSocket disconnects.
            connections = await PresenceService.connect(user_id=self.user.pk)
            await self.broadcast_presence(connections)
        except Room.DoesNotExist:
            await self.close(code=4004)
            return
    async def disconnect(self, close_code):
        # Decrement the user's active connection count in Redis
        connections = await PresenceService.disconnect(user_id=self.user.pk)
        await self.broadcast_presence(connections)
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name)

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "type":"message",
            "message":  event["message"],
            "room_id":event["room_id"],
            "sender_id": event["sender_id"],
            "sender_username":event["sender_username"],
            "sender_firstname":event.get('sender_firstname'),
            "sender_lastname":event.get('sender_lastname'),
            "message_id":event["message_id"]
        }))

    async def chat_message_edit(self, event):
        await self.send(text_data=json.dumps({
            "type":"message_edit",
            "message":  event["message"],
            "room_id":event["room_id"],
            "sender_id": event["sender_id"],
            "message_id":event["message_id"],
            "edited_at":event["edited_at"]
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
            "read_at": event["read_at"]
        })
    )
        
    async def chat_message_delete(self,event):
        await self.send(
        text_data=json.dumps({
            "type": "message_delete",
            "room_id":event['room_id'],
            "user_id": event["user_id"],
            "message_ids": event["message_ids"],
        })
    )
    
    async def chat_presence(self,event):
        await self.send(
        text_data=json.dumps({
            "type": "presence",
            "is_online":event["is_online"],
            "last_seen":event.get("last_seen"),
            "user_id": event["user_id"],
        })
    )


    async def receive(self, text_data):
        """
        Redirect incoming events to their corresponding handler
        """
        data = json.loads(text_data)
        handlers = {
            "message":self.handle_message,
            "message_edit":self.handle_message_edit,
            "message_delete":self.handle_message_delete,
            "typing":self.handle_typing,
            "read":self.handle_read,
            "heartbeat":self.handle_heartbeat
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
        if not text or not text.strip():
            await self.send(text_data=json.dumps({
                    'error':'Message is required'
                }))
            return
        message = await MessageService.create_message(
                user=self.user,
                room=self.room,
                text=text,)
        profile= profile = await Profile.objects.aget(user=self.user)
        await self.channel_layer.group_send(self.room_group_name,{
            "type":"chat.message",
            "message":message.text,
            "sender_id":self.user.pk,
            "sender_username":self.user.username,
            "sender_firstname":profile.first_name,
            "sender_lastname":profile.last_name,
            "message_id":message.id,
            "room_id":self.room_id
            },)
        notification = {
            "type":"chat.notification",
            "message":message.text[:80],
            "sender_id":self.user.pk,
            "sender_username":self.user.username,
            "sender_firstname":profile.first_name,
            "sender_lastname":profile.last_name,
            "message_id":message.id,
            "room_id":self.room_id,
            "created_at": message.created_date.isoformat(),
            }
        participants = await MessageService.get_other_participants(room=self.room , user_pk= self.user.pk)
        for pid in participants:
            await self.channel_layer.group_send(f"user_{pid}",notification)

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
        serializer = MessageIdsSerializer(data=data)
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
        read_at =  timezone.now()
        await self.channel_layer.group_send(self.room_group_name,{
            "type":"chat.read",
            "user_id":self.user.pk,
            "room_id":self.room_id,
            "message_ids":read_messages,
            "read_at": read_at.isoformat()
            },)

    async def broadcast_presence(self,connections):
        """
        Avoid duplicate presence broadcasts when the user opens multiple tabs.
        """
        user_pk = self.user.pk
        if connections == 1:

            await self.channel_layer.group_send(self.room_group_name,{
            "type":"chat.presence",
            "is_online":True,
            "user_id":user_pk,
            },)
        elif connections == 0:
            last_seen = timezone.now()
            self.user.last_seen = last_seen
            await self.user.asave(update_fields=['last_seen'])
            rooms = await PresenceService.rooms_id(user_id=user_pk)
            # broadcasts the presence for every room that user is a participants in
            for room_id in rooms:
                await self.channel_layer.group_send(f"room_{room_id}",{
            "type":"chat.presence",
            "is_online":False,
            "user_id":user_pk,
            "last_seen":last_seen.isoformat()
            },)
        else:
            return
    async def handle_heartbeat(self,data):
        "refresh the expiration of the connection count"
        await PresenceService.heartbeat(user_id=self.user.pk)
    async def handle_message_edit(self,data):
        new_message=data.get("message")
        message_id = data.get("message_id")
        # if user sending space instead of message got an error
        if not new_message or not new_message.strip() or not message_id:
            await self.send(text_data=json.dumps({
                    'error':"message and message_id are required"
                }))
            return
        message = await MessageService.edit_message(user_id=self.user.pk,message_id=message_id,new_message=new_message)
        if not message:
            await self.send(text_data=json.dumps({
            "error": "message not found"
        }))
            return
        await self.channel_layer.group_send(self.room_group_name,{
            "type":"chat.message_edit",
            "message":message.text,
            "sender_id":self.user.pk,
            "message_id":message.id,
            "room_id":self.room_id,
            "edited_at": message.updated_date.isoformat()
            },)
    async def handle_message_delete(self,data):
        serializer = MessageIdsSerializer(data=data)
        if not serializer.is_valid():
            await self.send(
        text_data=json.dumps({
                "errors": serializer.errors
            }))
            return
        message_ids = serializer.validated_data['message_ids']
        try:
            await MessageService.delete_messages(message_ids=message_ids,room=self.room,
                                                user_pk=self.user.pk)
        except ValidationError as exc:
            await self.send(
        text_data=json.dumps({
            "errors": exc.detail,
        })
    )
            return
        await self.channel_layer.group_send(self.room_group_name,{
            "type":"chat.message_delete",
            "user_id":self.user.pk,
            "room_id":self.room_id,
            "message_ids":message_ids
            },)
        
        