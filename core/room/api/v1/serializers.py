from rest_framework import serializers
from accounts.api.v1.serializers import ProfileSerializer
from room.models import Room , ModelType

class RoomListSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    last_message_at = serializers.SerializerMethodField()
    pv_avatar = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    class Meta:
        model = Room
        fields = ['id','name','link','model','pv_avatar','creator','participants','profile','created_date','updated_date', 'last_message', 'last_message_at']

    def get_last_message(self,obj):
            return getattr(obj,'last_message_text',None)

    def get_last_message_at(self, obj):
            value = getattr(obj, 'last_message_at', None)
            return value.isoformat() if value else None

    def get_pv_avatar(self,obj):
        if obj.model == ModelType.pv.value:
            user_pk = self.context["request"].user.pk
            friend = obj.participants.exclude(pk=user_pk).first()
            if friend and friend.avatar:
                return friend.avatar.url
            return None
        else:
            return None
    def get_name(self,obj):
        if obj.model == ModelType.pv.value:
            user_pk = self.context["request"].user.pk
            friend = obj.participants.exclude(pk=user_pk).first()
            if not friend:
                return None
            if friend.first_name or friend.last_name:
                return f"{friend.first_name} {friend.last_name}".strip()
            return friend.user.username
        return obj.name
class BaseRoomSerializer(serializers.ModelSerializer):
    name = serializers.CharField(allow_null=True)
    link = serializers.SlugField(allow_null=True)

    MAX_PARTICIPANTS = 1000
    def _validate_room(self, *, creator , participants, model, link , name):
        participants = set(participants)

        #in every model the creator must be in participants
        if creator not in participants:
            raise serializers.ValidationError("The creator must be one of the participants")
        
        
        # participants restriction numbers
        if len(participants) > self.MAX_PARTICIPANTS:
            raise serializers.ValidationError({
        "participants": f"A room can have at most {self.MAX_PARTICIPANTS} participants."
             })

        pv_model = ModelType.pv.value 

        # in pv model participant must be 2
        if model == pv_model and len(participants) != 2 :
            raise serializers.ValidationError("In Pv room participants must be 2")
        
        # pv model doesn't have a link and name
        if model == pv_model:
            if link is not None or name is not None :
                raise serializers.ValidationError("In Pv room link and name must be null")
        
        # In Group model link and name must be set
        if model != pv_model:
            if link is None or name is None:
                raise serializers.ValidationError('In Group room link and name must be set')

class RoomCreateSerializer(BaseRoomSerializer):
    creator = serializers.PrimaryKeyRelatedField(read_only=True)
    class Meta:
        model = Room
        fields = ['id','name','link','participants','profile','model','creator']

    def validate(self, attrs):
        self._validate_room(
        creator = self.context['request'].user.user_profile,
        participants = attrs.get("participants", []),
        model = attrs.get('model'),
        link = attrs.get('link'),
        name = attrs.get('name'),
        )

        
        

        return attrs



class RoomUpdateSerializer(BaseRoomSerializer):
    class Meta:
        model = Room
        fields = ['name','link','participants','profile']

    def validate(self, attrs):
        self._validate_room(
        creator = self.instance.creator,
        participants =attrs.get("participants", self.instance.participants.all()),
        model = self.instance.model,
        link = attrs.get('link',self.instance.link),
        name = attrs.get('name',self.instance.name),
        )


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
