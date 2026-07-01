from django.db import models
from django.contrib.auth.models import (
    BaseUserManager,
    AbstractBaseUser,
    PermissionsMixin,
)
from django.utils.translation import gettext_lazy as _
from django.db.models.signals import post_save
from django.dispatch import receiver





class ProfileGender(models.IntegerChoices):
    male = 1, _("male")
    female = 2, _("female")
    not_to_mention = 3, _("not to mention")


class UserManager(BaseUserManager):
    def create_user(self, username, password, **extra_fields):
        """
        create and save user with username
        """
        if not username:
            raise ValueError(_("the username must be set"))
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, username, password, **extra_fields):
        """
        create and save super user with username
        """

        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_staff", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("is_staff must be True for Super user"))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("is_superuser must be True for Super user"))
        # if extra_fields.get("type") is not UserType.superuser.value:
        #     raise ValueError(_("type must be superuser for Super user"))
        return self.create_user(username, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=255, unique=True)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)
    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = []
    objects = UserManager()

    def __str__(self):
        return self.username


class Profile(models.Model):
    user = models.OneToOneField(
        "User", on_delete=models.CASCADE, related_name="user_profile"
    , primary_key=True)
    first_name = models.CharField(max_length=250)
    last_name = models.CharField(max_length=250)
    avatar = models.ImageField(
        upload_to="profiles/", null=True , blank=True
    )
    gender = models.IntegerField(
        choices=ProfileGender.choices, null=True, blank=True
    )
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)



@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance, pk=instance.pk)