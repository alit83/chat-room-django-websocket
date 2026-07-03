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
        participants = set(attrs.get("participants", []))
        model = attrs.get('model')

        #in every model the creator must be in participants
        if creator not in participants:
            raise serializers.ValidationError("The creator must be one of the participants")
        
        MAX_PARTICIPANTS = 1000

        if len(participants) > MAX_PARTICIPANTS:
            raise serializers.ValidationError({
        "participants": f"A room can have at most {MAX_PARTICIPANTS} participants."
             })

        # in pv model participant must be 2
        if model == ModelType.pv.value and len(participants) != 2 :
            raise serializers.ValidationError("In Pv room participants must be 2")
        
        return attrs



class RoomUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['name','link','participants','profile']

    def validate(self, attrs):
        participants = set(attrs.get("participants", self.instance.participants.all()))
        model = self.instance.model
        creator = self.instance.creator
              
        # n every model the creator must be in participants
        if creator not in participants:
            raise serializers.ValidationError("The creator must be one of the participants")

        MAX_PARTICIPANTS = 1000

        if len(participants) > MAX_PARTICIPANTS:
            raise serializers.ValidationError({
        "participants": f"A room can have at most {MAX_PARTICIPANTS} participants."
             })

        # in pv model participant must be 2
        if model == ModelType.pv.value and len(participants) != 2 :
            raise serializers.ValidationError("In Pv room participants must be 2")
        
        if len(participants) != len(set(participants)):
            raise serializers.ValidationError({
        "participants": "Duplicate participants are not allowed."
    })

        return attrs
        