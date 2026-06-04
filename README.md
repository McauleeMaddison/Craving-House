# Craving House Coffee App

Craving House is a Python and Django web application for a coffee shop. It allows customers to browse a menu, create a pickup order, collect loyalty stamps, and send feedback. It also gives staff a live order queue and gives managers control over menu items and availability.

This project is built with the required Python and Django stack.

Official repository:

```text
https://github.com/McauleeMaddison/Craving-House
```

## Technology Stack

- Python 3.9+
- Django 4.2
- SQLite for local development
- Django templates for server-rendered pages
- Django forms for validation
- Django ORM for database models and queries
- Django authentication and admin
- Django test runner for quality checks

## Main Features

- Customer menu browsing with prices, prep times, and item availability
- Session-based cart for pickup orders
- Checkout flow for counter payment
- Private order confirmation pages with lookup codes
- Staff dashboard for viewing and updating active orders
- Digital loyalty card with staff stamp scanning
- Interactive Bean Roaster Clicker mini game
- Customer feedback form saved to the database
- Manager dashboard for creating, editing, showing, and hiding menu items
- Django admin for full data management

## Project Structure

- `manage.py` - Django command-line entry point
- `craving_house/` - Django project settings, root URLs, ASGI, and WSGI config
- `cafe/` - main application code, including models, forms, views, admin, tests, and demo seed command
- `templates/` - Django HTML templates
- `static/django/` - application CSS and JavaScript
- `images/` - Craving House brand assets served as static files
- `requirements.txt` - Python dependencies
- `.env.example` - example production environment variables

## Required Stack Evidence

- `manage.py` starts and manages the Django application.
- `craving_house/settings.py` configures the Django project.
- `cafe/models.py` defines the database schema using the Django ORM.
- `cafe/views.py` handles customer, staff, manager, and loyalty workflows.
- `templates/` contains server-rendered Django pages.
- `static/django/js/clicker.js` powers the interactive clicker game.
- `cafe/tests.py` verifies ordering and access-control behaviour.
- `requirements.txt` lists Django as the application dependency.

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

Open the application at:

```text
http://127.0.0.1:8000/
```

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

Expected result: all commands complete successfully.

## Functional Acceptance Checklist

Use this checklist before submitting or demonstrating the project:

- Open `/` and confirm the homepage loads.
- Open `/menu/` and confirm seeded menu items appear.
- Add an item to the cart.
- Place a pickup order from checkout.
- Confirm the order appears in `/staff/`.
- Update the order status from the staff dashboard.
- Create or sign into a customer account and open `/loyalty/`.
- Open `/clicker/` and confirm the Bean Roaster Clicker game responds to clicks.
- Add loyalty stamps from the staff dashboard.
- Submit feedback from `/feedback/`.
- Sign into `/admin/` or `/manager/` and confirm menu data is manageable.

## Deployment Notes

- Set `DJANGO_SECRET_KEY` to a unique production value.
- Set `DJANGO_DEBUG=false`.
- Set `DJANGO_ALLOWED_HOSTS` to the deployed domain names.
- Keep `DJANGO_SECURE_SSL_REDIRECT=true` for HTTPS deployments.
- Run `python3 manage.py migrate` before first production use.
- Create a production admin account with `python3 manage.py createsuperuser`.
- Replace or delete demo accounts before real use.
- Do not commit real `.env` files or production secrets.

## Render Deployment

This project includes a root `Dockerfile` for Render Docker deployments.

Recommended Render settings:

- Environment: Docker
- Repository: `McauleeMaddison/Craving-House`
- Branch: `main`
- Dockerfile path: `Dockerfile`
- Root directory: leave blank unless the repository is inside a subfolder

If you use a Render Python service instead of Docker, use these commands:

```text
Build Command: sh ./render-build.sh
Start Command: sh ./render-start.sh
```

Do not use any `npm`, `apps/web`, Prisma, Next.js, or Node build command for this project. This is a Django application.

Recommended environment variables:

```text
DJANGO_SECRET_KEY=<generate-a-long-random-secret>
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=.onrender.com,<your-render-domain>
DJANGO_CSRF_TRUSTED_ORIGINS=https://*.onrender.com,https://<your-render-domain>
DJANGO_SECURE_SSL_REDIRECT=true
DJANGO_SECURE_HSTS_SECONDS=31536000
DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=false
SEED_DEMO_DATA=true
```

If you attach a Render PostgreSQL database, Render provides `DATABASE_URL` automatically. The application will use it. If no `DATABASE_URL` is present, the container falls back to SQLite, which is suitable only for a temporary demo because container storage is not permanent.

The Docker startup script runs:

```bash
python manage.py migrate --noinput
python manage.py seed_demo
gunicorn craving_house.wsgi:application
```
