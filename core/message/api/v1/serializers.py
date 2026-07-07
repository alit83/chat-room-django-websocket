from rest_framework import serializers
from message.models import Message
from accounts.api.v1.serializers import ProfileSerializer

class MessageListSerializer(serializers.ModelSerializer):
    sender = ProfileSerializer()

    class Meta:
        model = Message
        fields = ['sender','text','room','is_read','created_date','updated_date']


class MessageCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Message
        fields = ['text']

class MessageUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Message
        fields = ['text']