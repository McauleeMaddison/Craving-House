# Submission Notes

This resubmission is implemented as a Python and Django project.

Evidence for the required stack:

- `manage.py` runs the application.
- `craving_house/settings.py` configures the Django project.
- `cafe/models.py` defines the database models with the Django ORM.
- `cafe/views.py` and `templates/` render the customer, staff, and manager pages.
- `cafe/tests.py` verifies the main ordering and access-control flows.
- `requirements.txt` lists Django as the application dependency.

Run these commands from the repository root:

```bash
python3 -m pip install -r requirements.txt
python3 manage.py migrate
python3 manage.py seed_demo
python3 manage.py runserver
```
