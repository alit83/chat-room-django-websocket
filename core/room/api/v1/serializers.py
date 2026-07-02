from rest_framework import serializers
from room.models import Room , ModelType

class RoomListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = '__all__'


class RoomCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = '__all__'

    def validate(self, attrs):
        request = self.context['request']
        creator = request.user.user_profile
        participants = attrs.get("participants", [])
        model = attrs.get('model')

        #in every model the creator must be in participants
        if creator not in participants:
            raise serializers.ValidationError("The creator must be one of the participants")
        
        
        # in pv model participant must be 2
        if model == ModelType.pv.value and len(participants) != 2 :
            raise serializers.ValidationError("In Pv room participants must be 2")
        
        return super().validate(attrs)
    