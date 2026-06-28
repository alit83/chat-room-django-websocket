from django.db import models

# Create your models here.

class Message(models.Model):
    sender = models.ForeignKey('accounts.Profile',on_delete=models.RESTRICT)
    text = models.TextField()
    room = models.ForeignKey('room.Room',on_delete=models.CASCADE)
    is_read = models.BooleanField(default=False)
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)
    