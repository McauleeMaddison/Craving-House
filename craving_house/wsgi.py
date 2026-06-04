"""WSGI config for the Craving House Django project."""
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "craving_house.settings")

application = get_wsgi_application()
