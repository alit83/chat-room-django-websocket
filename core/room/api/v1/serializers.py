from rest_framework import serializers
from accounts.api.v1.serializers import ProfileSerializer
from room.models import Room , ModelType

class RoomListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = '__all__'


class RoomCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['name','link','participants','profile','model']

    def validate(self, attrs):
        request = self.context['request']
        creator = request.user.user_profile
        participants = set(attrs.get("participants", []))
        model = attrs.get('model')
        link = attrs.get('link')

        #in every model the creator must be in participants
        if creator not in participants:
            raise serializers.ValidationError("The creator must be one of the participants")
        
        MAX_PARTICIPANTS = 1000

        if len(participants) > MAX_PARTICIPANTS:
            raise serializers.ValidationError({
        "participants": f"A room can have at most {MAX_PARTICIPANTS} participants."
             })

        pv_model = ModelType.pv.value 

        # in pv model participant must be 2
        if model == pv_model and len(participants) != 2 :
            raise serializers.ValidationError("In Pv room participants must be 2")
        
        # pv model doesn't have a link
        if model == pv_model and link != None :
            raise serializers.ValidationError("In Pv room link must be null")
        
        # In Group model link must be set
        if model != pv_model and link == None :
            raise serializers.ValidationError('In Group room link must be set')
        
        

        return attrs



class RoomUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['name','link','participants','profile']

    def validate(self, attrs):
        participants = set(attrs.get("participants", self.instance.participants.all()))
        model = self.instance.model
        creator = self.instance.creator
        link = (attrs.get('link'),self.instance.link)
              
        # n every model the creator must be in participants
        if creator not in participants:
            raise serializers.ValidationError("The creator must be one of the participants")

        MAX_PARTICIPANTS = 1000

        if len(participants) > MAX_PARTICIPANTS:
            raise serializers.ValidationError({
        "participants": f"A room can have at most {MAX_PARTICIPANTS} participants."
             })

        pv_model = ModelType.pv.value 

        # in pv model participant must be 2
        if model == pv_model and len(participants) != 2 :
            raise serializers.ValidationError("In Pv room participants must be 2")
        
        # pv model doesn't have a link
        if model == pv_model and link != None :
            raise serializers.ValidationError("In Pv room link must be null")
        
        # In Group model link must be set
        if model != pv_model and link == None :
            raise serializers.ValidationError('In Group room link must be set')



        return attrs
        
class RoomDetailSerializer(serializers.ModelSerializer):
    participants = ProfileSerializer(many=True)
    class Meta:
        model = Room
        fields = ["id","name","link","model","creator","participants",'profile'
]

class RoomLinkSerializer(serializers.ModelSerializer):
    joined = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = ["id","model",'joined','profile','name','link']
    
    def get_joined(self, obj):
        user = self.context["request"].user
        return obj.participants.filter(pk=user.pk).exists()
