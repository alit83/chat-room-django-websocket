from django.db import models
from django.utils.translation import gettext_lazy as _
# Create your models here.

class ModelType(models.IntegerChoices):
    pv = 1, _("pv")
    group_public = 2, _("group_public")
    group_private = 3, _("group_private")


class Room(models.Model):
    participants = models.ManyToManyField('accounts.Profile',related_name='participant')
    creator=models.ForeignKey('accounts.Profile',on_delete=models.CASCADE, related_name='creator_profile',null=True)
    model = models.IntegerField(choices=ModelType.choices)
    name = models.CharField(max_length=255)
    link = models.SlugField(unique=True,null=True)
    profile=models.ImageField(upload_to='room_profile/',null=True,blank=True)
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)
    