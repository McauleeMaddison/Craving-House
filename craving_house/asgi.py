"""ASGI config for the Craving House Django project."""
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "craving_house.settings")

application = get_asgi_application()
