#!/usr/bin/env sh
set -eu

python manage.py migrate --noinput

if [ "${SEED_DEMO_DATA:-true}" = "true" ]; then
  python manage.py seed_demo
fi

exec gunicorn craving_house.wsgi:application --bind "0.0.0.0:${PORT:-8000}"
