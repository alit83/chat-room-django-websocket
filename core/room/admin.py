from django.contrib import admin
from room.models import Room
# Register your models here.


class RoomAdmin(admin.ModelAdmin):
    list_display = [ "creator", "model", "name","link"]
    search_fields = ("creator",)



admin.site.register(Room, RoomAdmin)

