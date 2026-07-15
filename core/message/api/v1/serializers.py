from rest_framework import serializers
from message.models import Message , MessageRead
from accounts.api.v1.serializers import ProfileSerializer

class MessageListSerializer(serializers.ModelSerializer):
    sender = ProfileSerializer()

    class Meta:
        model = Message
        fields = ['sender','text','room','created_date','updated_date']




class MessageIdsSerializer(serializers.Serializer):
    message_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
    )