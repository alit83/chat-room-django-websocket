from rest_framework.permissions import BasePermission

class IsRoomCreator(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.creator_id == request.user.pk