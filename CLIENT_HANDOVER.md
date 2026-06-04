# Django Project Handover Checklist

Use this before any demo, assessment submission, or production transfer.

## 1) Release Health Gate

Run from the repository root:

```bash
python3 manage.py check
python3 manage.py test
python3 manage.py collectstatic --noinput
```

Expected result: all commands pass.

## 2) Environment and Secrets

1. Copy `.env.example` into your deployment environment.
2. Set a unique `DJANGO_SECRET_KEY`.
3. Set `DJANGO_DEBUG=false`.
4. Set `DJANGO_ALLOWED_HOSTS` to the deployed domain names.
5. Do not commit real `.env` files or production secrets.

## 3) Database Setup

For local assessment, SQLite is configured automatically.

For a fresh local demo:

```bash
python3 manage.py migrate
python3 manage.py seed_demo
```

For production, run migrations on the production database before first use:

```bash
python3 manage.py migrate
```

## 4) Access Handover

1. Create a real superuser:

```bash
python3 manage.py createsuperuser
```

2. Replace or delete demo accounts after assessment.
3. Give staff users either Django `is_staff` access or membership in the `Staff` group.
4. Give managers superuser access or membership in the `Manager` group.
5. Verify the `/staff/`, `/manager/`, and `/admin/` areas with the intended accounts.

## 5) Functional Acceptance

1. Add at least one menu item.
2. Place a customer order from `/menu/`.
3. Confirm the order appears in `/staff/`.
4. Update the order status to ready.
5. Create a customer account and view `/loyalty/`.
6. Add loyalty stamps from the staff dashboard.
7. Submit feedback and confirm it appears in Django admin.
