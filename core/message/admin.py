from django.contrib import admin
from message.models import Message
# Register your models here.


class MessageAdmin(admin.ModelAdmin):
    list_display = ['id', "sender", "text", "is_read","room"]
    search_fields = ("sender",)



admin.site.register(Message, MessageAdmin)

