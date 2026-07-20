from rest_framework import serializers
from message.models import Message , MessageRead
from accounts.api.v1.serializers import ProfileSerializer

class MessageReadSerializer(serializers.ModelSerializer):

    class Meta:
        model = MessageRead
        fields = ['read_date','user']


class MessageListSerializer(serializers.ModelSerializer):
    sender = ProfileSerializer()
    read_by = MessageReadSerializer(source = "read_message",many = True)

    class Meta:
        model = Message
        fields = ['pk','sender','text','room','read_by','created_date','updated_date']




class MessageIdsSerializer(serializers.Serializer):
    message_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
    )