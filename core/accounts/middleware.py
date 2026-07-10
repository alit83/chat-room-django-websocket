from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

from django.contrib.auth import get_user_model

User = get_user_model()


def get_user(user_id):
    """
    this function do query to get user if exist with async orm 
    """
    try:
        return User.objects.aget(pk=user_id)
    except User.DoesNotExist:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    websocket middleware for jwt authentication 

    get the token  from websocket connections and check the validation
    """
    async def __call__(self, scope, receive, send):
        query_string = parse_qs(scope["query_string"].decode())

        token = query_string.get("token")

        if not token:
            scope["user"] = AnonymousUser()
            return await super().__call__(scope, receive, send)


        token = token[0]

        try:
            access_token = AccessToken(token)
            user = await get_user(access_token["user_id"])
            scope["user"] = user

        except TokenError:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)