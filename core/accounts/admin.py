from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from accounts.models import Profile
from django.contrib.auth import get_user_model
User = get_user_model()


# Register your models here.
class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ['id',"username", "is_active", "is_superuser"]
    list_filter = ["username", "is_active", "is_superuser"]
    search_fields = ("username",)
    ordering = ("username",)
    fieldsets = (
        (
            "Authentication",
            {
                "fields": ("username", "password"),
            },
        ),
        (
            "permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                ),
            },
        ),
        (
            "group_permissions",
            {
                "fields": ("groups", "user_permissions"),
            },
        ),
        (
            "important_dates",
            {
                "fields": ("last_login",),
            },
        ),
    )
    add_fieldsets = (
        (
            "create_User",
            {
                "classes": ("wide",),
                "fields": (
                    "username",
                    "password1",
                    "password2",
                    "is_staff",
                    "is_active",
                    "is_superuser",
                ),
            },
        ),
    )


class ProfileAdmin(admin.ModelAdmin):
    list_display = [ "user", "gender", "first_name","last_name"]
    search_fields = ("user",)


admin.site.register(User, CustomUserAdmin)
admin.site.register(Profile, ProfileAdmin)




