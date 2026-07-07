from django.db import models

# Create your models here.

class Message(models.Model):
    sender = models.ForeignKey('accounts.Profile',on_delete=models.RESTRICT)
    text = models.TextField()
    room = models.ForeignKey('room.Room',on_delete=models.CASCADE)
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)
    
class MessageRead(models.Model):
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name="read_message",
    )
    user = models.ForeignKey(
        'accounts.Profile',
        on_delete=models.CASCADE,
    )
    read_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["message", "user"],
                name="unique_message_read",
            )
        ]