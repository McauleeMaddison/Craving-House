"""Django settings for the Craving House Coffee App."""
from pathlib import Path
import os
from urllib.parse import unquote, urlparse

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get(
  "DJANGO_SECRET_KEY",
  "django-insecure-local-development-key-change-before-production",
)

DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() == "true"

ALLOWED_HOSTS = [
  host.strip()
  for host in os.environ.get(
    "DJANGO_ALLOWED_HOSTS",
    "127.0.0.1,localhost,.onrender.com",
  ).split(",")
  if host.strip()
]

CSRF_TRUSTED_ORIGINS = [
  origin.strip()
  for origin in os.environ.get(
    "DJANGO_CSRF_TRUSTED_ORIGINS",
    "https://*.onrender.com",
  ).split(",")
  if origin.strip()
]

INSTALLED_APPS = [
  "django.contrib.admin",
  "django.contrib.auth",
  "django.contrib.contenttypes",
  "django.contrib.sessions",
  "django.contrib.messages",
  "django.contrib.staticfiles",
  "cafe",
]

MIDDLEWARE = [
  "django.middleware.security.SecurityMiddleware",
  "whitenoise.middleware.WhiteNoiseMiddleware",
  "django.contrib.sessions.middleware.SessionMiddleware",
  "django.middleware.common.CommonMiddleware",
  "django.middleware.csrf.CsrfViewMiddleware",
  "django.contrib.auth.middleware.AuthenticationMiddleware",
  "django.contrib.messages.middleware.MessageMiddleware",
  "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "craving_house.urls"

TEMPLATES = [
  {
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [BASE_DIR / "templates"],
    "APP_DIRS": True,
    "OPTIONS": {
      "context_processors": [
        "django.template.context_processors.debug",
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
        "cafe.context_processors.cart",
      ],
    },
  },
]

WSGI_APPLICATION = "craving_house.wsgi.application"

DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
  parsed_db = urlparse(DATABASE_URL)
  DATABASES = {
    "default": {
      "ENGINE": "django.db.backends.postgresql",
      "NAME": unquote(parsed_db.path.removeprefix("/")),
      "USER": unquote(parsed_db.username or ""),
      "PASSWORD": unquote(parsed_db.password or ""),
      "HOST": parsed_db.hostname,
      "PORT": parsed_db.port or 5432,
      "OPTIONS": {"sslmode": "require"},
      "CONN_MAX_AGE": 600,
    }
  }
else:
  DATABASES = {
    "default": {
      "ENGINE": "django.db.backends.sqlite3",
      "NAME": BASE_DIR / "db.sqlite3",
    }
  }

AUTH_PASSWORD_VALIDATORS = [
  {
    "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
  },
  {
    "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
  },
  {
    "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
  },
  {
    "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
  },
]

LANGUAGE_CODE = "en-gb"
TIME_ZONE = "Europe/London"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATICFILES_DIRS = [
  BASE_DIR / "static",
  ("brand", BASE_DIR / "images"),
]
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LOGIN_REDIRECT_URL = "cafe:home"
LOGOUT_REDIRECT_URL = "cafe:home"

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_SSL_REDIRECT = os.environ.get(
  "DJANGO_SECURE_SSL_REDIRECT",
  "true" if not DEBUG else "false",
).lower() == "true"
SECURE_HSTS_SECONDS = int(
  os.environ.get("DJANGO_SECURE_HSTS_SECONDS", "31536000" if not DEBUG else "0")
)
SECURE_HSTS_INCLUDE_SUBDOMAINS = os.environ.get(
  "DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS",
  "false",
).lower() == "true"
