from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from accounts.models import User
from django.core import exceptions


class SignUpApiSerializer(serializers.ModelSerializer):
    password1 = serializers.CharField(max_length=255, write_only=True)

    class Meta:
        model = User
        fields = ["username", "password", "password1"]

    def validate(self, attrs):
        if attrs.get("password") != attrs.get("password1"):
            raise serializers.ValidationError(
                {"details": "password confirm does not match"}
            )
        try:
            validate_password(attrs.get("password"))
        except exceptions.ValidationError as e:
            raise serializers.ValidationError({"password": list(e.message)})
        return super().validate(attrs)

    def create(self, validated_data):
        validated_data.pop("password1", None)
        return User.objects.create_user(**validated_data)

class CustomeTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        validated_data = super().validate(attrs)
        validated_data['username'] = self.user.username
        return validated_data