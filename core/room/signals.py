from .models import Room
from django.dispatch import receiver
from django.db.models.signals import pre_save
from django.core.cache import cache


@receiver(pre_save, sender=Room)
def room_update(sender, instance, **kwargs):
    # for created room
    if instance.pk is None:
        return

    old = sender.objects.only(
        "last_message_id",
    ).get(pk=instance.pk)
    if old.last_message_id != instance.last_message_id:
        return
    cache.delete(f"room:{instance.pk}:meta")
