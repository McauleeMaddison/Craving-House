# Craving House Coffee App

Craving House is a Python and Django web application for a coffee shop. It supports customer pickup ordering, session carts, loyalty stamps, feedback collection, staff order handling, and manager menu control.

## Stack

- Python 3
- Django 4.2
- SQLite for local development
- Django templates, forms, ORM, authentication, admin, and tests

The submitted application is the Django project at the repository root. Historical files under `apps/web` are not needed to run or assess this Django submission.

## Project Layout

- `manage.py` - Django command entry point
- `craving_house/` - project settings and root URL configuration
- `cafe/` - Django app with models, forms, views, admin, tests, and seed command
- `templates/` - server-rendered Django templates
- `static/django/` - CSS and JavaScript used by the Django templates
- `images/` - Craving House brand and loyalty assets served through Django static files

## Local Setup

Create and activate a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
python3 -m pip install -r requirements.txt
```

Create the database and demo data:

```bash
python3 manage.py migrate
python3 manage.py seed_demo
```

Run the app:

```bash
python3 manage.py runserver
```

Open `http://127.0.0.1:8000/`.

## Demo Accounts

The seed command creates these accounts:

- Manager: `manager` / `ManagerPass123`
- Staff: `staff` / `StaffPass123`
- Customer: `customer` / `CustomerPass123`

Change these passwords before using the project outside local demonstration.

## Quality Checks

```bash
python3 manage.py check
python3 manage.py test
python3 manage.py collectstatic --noinput
```

## Main Features

- Customer menu browsing and cart-based pickup checkout
- Order totals and prep-time calculations stored with each order
- Private order confirmation links with lookup codes
- Digital loyalty card with staff stamp scanning
- Feedback form saved to the database
- Staff dashboard for order status changes
- Manager dashboard for menu item create, edit, and availability control
- Django admin for full data management
