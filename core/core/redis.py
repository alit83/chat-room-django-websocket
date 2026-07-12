from django.conf import settings
from redis.asyncio import Redis

redis = Redis.from_url(settings.REDIS_URL,decode_responses=True)