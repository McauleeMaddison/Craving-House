#!/usr/bin/env sh
set -eu

python -m pip install -r requirements.txt
python manage.py collectstatic --noinput
