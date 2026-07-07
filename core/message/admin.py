from django.contrib import admin
from message.models import Message , MessageRead
# Register your models here.


class MessageAdmin(admin.ModelAdmin):
    list_display = ['id', "sender", "text","room"]
    search_fields = ("sender",)

class MessageReadAdmin(admin.ModelAdmin):
    list_display = ['id', "message", "user","read_date"]

admin.site.register(Message, MessageAdmin)

admin.site.register(MessageRead, MessageReadAdmin)

