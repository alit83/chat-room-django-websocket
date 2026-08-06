from django.db import models
from django.utils.translation import gettext_lazy as _

# Create your models here.


class ModelType(models.IntegerChoices):
    pv = 1, _("pv")
    group_public = 2, _("group_public")
    group_private = 3, _("group_private")


class Room(models.Model):
    participants = models.ManyToManyField("accounts.Profile")
    creator = models.ForeignKey(
        "accounts.Profile",
        on_delete=models.CASCADE,
        related_name="creator_profile",
    )
    model = models.IntegerField(choices=ModelType.choices)
    name = models.CharField(max_length=255, null=True, blank=True)
    link = models.SlugField(unique=True, null=True)
    profile = models.ImageField(
        upload_to="room_profile/", null=True, blank=True
    )
    last_message = models.ForeignKey(
        "message.Message",
        null=True,
        on_delete=models.SET_NULL,
        related_name="last_m",
    )
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)

    def get_pv_friend(self, user):
        if self.model != ModelType.pv:
            return None

        for participant in self.participants.all():
            if participant.pk != user.pk:
                return participant

        return None

    def get_pv_avatar(self, user):
        friend = self.get_pv_friend(user)
        if friend and friend.avatar:
            return friend.avatar.url
        return None

    def get_display_name(self, user):
        if self.model == ModelType.pv.value:
            friend = self.get_pv_friend(user)
            if not friend:
                return None
            if friend.first_name or friend.last_name:
                return f"{friend.first_name} {friend.last_name}".strip()
            return friend.user.username
        return self.name
