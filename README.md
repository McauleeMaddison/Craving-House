# Craving House Coffee App

Craving House is a Django web application for a coffee shop. Customers can browse the menu, build a pickup order, place it for counter payment, collect loyalty stamps, and send feedback. Staff can manage the live order queue and scan loyalty cards, while managers can maintain menu items and availability.

## Technology Stack

- Python 3.9+
- Django 4.2
- SQLite for local development
- Django templates, forms, authentication, admin, ORM, and test runner

## Features

- Menu browsing with item availability, prices, prep times, and loyalty eligibility
- Session-based cart and pickup checkout
- Order confirmation pages with private lookup links
- Staff dashboard for order status updates
- Digital loyalty card with staff stamp scanning
- Customer feedback form stored in the database
- Manager dashboard for menu item creation, editing, and visibility control
- Django admin for full data management

## Project Structure

- `manage.py` - Django command entry point
- `craving_house/` - project settings, ASGI/WSGI config, and root URLs
- `cafe/` - application models, forms, views, admin, tests, and seed command
- `templates/` - server-rendered Django templates
- `static/django/` - application CSS and JavaScript
- `images/` - Craving House brand assets served as static files
- `requirements.txt` - Python dependencies

## Setup

Create and activate a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
python3 -m pip install -r requirements.txt
```

Create the local database:

```bash
python3 manage.py migrate
```

Load demo menu data and test accounts:

```bash
python3 manage.py seed_demo
```

Start the development server:

```bash
python3 manage.py runserver
```

Open `http://127.0.0.1:8000/` in a browser.

## Demo Accounts

The seed command creates these local demonstration accounts:

- Manager: `manager` / `ManagerPass123`
- Staff: `staff` / `StaffPass123`
- Customer: `customer` / `CustomerPass123`

These credentials are for local assessment only. Create new accounts and passwords before using the application in any real environment.

## Quality Checks

Run these commands from the repository root:

```bash
python3 manage.py check
python3 manage.py test
python3 manage.py collectstatic --noinput
```

## Deployment Notes

- Set `DJANGO_SECRET_KEY` to a unique production value.
- Set `DJANGO_DEBUG=false`.
- Set `DJANGO_ALLOWED_HOSTS` to the deployed domain names.
- Run `python3 manage.py migrate` before first production use.
- Create a production admin account with `python3 manage.py createsuperuser`.
