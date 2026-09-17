# Assessment testing evidence — 17 September 2026

The main [README](../../README.md#front-end-testing) contains the manual functional, responsive, form and user-story tables. This directory supplies reproducible commands and raw results. Tests used the current local source; no commit, push, deployment, production write or payment was performed.

## Environment

- macOS local workstation; Python 3.9.6; Django 4.2.30.
- All four pinned packages in `requirements.txt` installed in `/tmp/craving-docs-venv`.
- The original system Python initially lacked Django. The first package-install attempt failed because the sandbox could not reach the package index. Retrying with approved network access installed the requirements successfully. This was an environment issue, not an application test failure.
- Browser: Codex in-app browser; version not reported by the tool. Chrome, Safari and Firefox were not independently exercised.
- Browser URL: `http://127.0.0.1:8765`; database `/tmp/craving-assessment.sqlite3`, freshly migrated and seeded. Stripe key removed from the server environment. Existing repository SQLite data was not used for mutations.

## Recorded commands

From the repository root, after `python3 -m venv /tmp/craving-docs-venv` and installing `requirements.txt`:

```bash
env -u DATABASE_URL -u STRIPE_SECRET_KEY DJANGO_DEBUG=true DJANGO_SECURE_SSL_REDIRECT=false \
  /tmp/craving-docs-venv/bin/python3 manage.py check

env -u DATABASE_URL -u STRIPE_SECRET_KEY DJANGO_DEBUG=true DJANGO_SECURE_SSL_REDIRECT=false \
  /tmp/craving-docs-venv/bin/python3 manage.py test

env -u DATABASE_URL -u STRIPE_SECRET_KEY DJANGO_DEBUG=true DJANGO_SECURE_SSL_REDIRECT=false \
  /tmp/craving-docs-venv/bin/python3 manage.py test docs.testing.request_checks --verbosity 2
```

| Output file | Actual result |
| --- | --- |
| [django-check.txt](django-check.txt) | System check: no issues (0 silenced), exit 0. |
| [django-tests.txt](django-tests.txt) | Original 35 tests, OK, exit 0. |
| [request-checks.txt](request-checks.txt) | Nine supplementary checks, OK, exit 0. Includes compilation of all 15 project templates. |
| [collectstatic.txt](collectstatic.txt) | 138 files copied; 404 post-processed to temporary output directory, exit 0. |
| [responsive-observations.json](responsive-observations.json) | Browser DOM measurements for 11 pages at three widths; Home entries collected separately. All document scroll widths are no greater than viewport width. |

Django's test runner created and destroyed its own test database. `request_checks.py` is intentionally named separately from normal `test*.py` discovery: run it with the explicit command above. It supplements the existing suite without changing its 35-test count. These are server/form tests, not manual browser results.

## Reproduce the isolated browser environment

The following temporary settings preserve the real templates, static source, URLs and application logic, while redirecting data/static output and configuring local HTTP. Use a fresh disposable SQLite file, not a copy of production data. Do not run `seed_demo` against a database whose menu edits you need to retain.

Create `/tmp/craving_assessment_settings.py`:

```python
from craving_house.settings import *
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': '/tmp/craving-assessment.sqlite3',
    }
}
STATIC_ROOT = '/tmp/craving-assessment-static'
DEBUG = True
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
ALLOWED_HOSTS = ['127.0.0.1', 'localhost', 'testserver']
```

Then run from the repository root:

```bash
export PYTHONPATH="$PWD:/tmp"
/tmp/craving-docs-venv/bin/python3 manage.py migrate --settings=craving_assessment_settings --noinput
/tmp/craving-docs-venv/bin/python3 manage.py seed_demo --settings=craving_assessment_settings
/tmp/craving-docs-venv/bin/python3 manage.py collectstatic --settings=craving_assessment_settings --noinput
env -u STRIPE_SECRET_KEY /tmp/craving-docs-venv/bin/python3 manage.py runserver 127.0.0.1:8765 --settings=craving_assessment_settings --noreload
```

A loopback-server permission was required in this workstation's sandbox. The temporary settings file and database are outside the repository and are not deliverables. For subsequent runs use new temporary paths if the old ones still contain assessment data. Do not export these local HTTP settings into a deployment.

## Browser protocol and results

The M01–M20 records in the main README were performed through actual browser controls with the seeded guest/customer/staff/manager roles. DOM snapshots, rendered text and validity flags verified results; screenshots were captured from the same local application. No mocked UI or generated screenshot image was used.

Key transaction: one Americano (£3.10) and one Waffle Plain (£5.30) with Nutella (£1.10), initially £9.50; waffle quantity changed to two, £15.90; Americano removed, £12.80; counter checkout stored two customised waffles with 10-minute prep; staff changed status to Ready; customer confirmation reflected it. Staff added three stamps and the customer card displayed 3/8. Manager created Assessment Cocoa at £2.75, edited it to £2.95, hid it (disabled Unavailable card) and restored availability. This data existed only in the temporary database.

Responsive checks set widths/heights to 375×812, 768×900 and 1440×900 and read:

```javascript
({ width: innerWidth, scroll: document.documentElement.scrollWidth })
```

`scroll <= width` verifies only lack of document-level horizontal overflow. Measurements may include a 15px scrollbar difference. Main-page presence was also recorded for most rows. The unused computed-column field was removed from the report because it selected the main wrapper rather than the layout grid; no column-count claim is based on that field. CSS breakpoint descriptions instead come from source inspection.

Screenshots are viewport captures: full-page capture included the off-screen drawer, so those captures were replaced with viewport captures rather than presenting misleading images. Mobile home/menu/loyalty/staff/manager and desktop home/checkout were visually inspected. Screenshots and width measurements do not prove screen-reader support, adequate contrast, physical-device operation or cross-browser equivalence.

## Remaining checks and interpretation

- External Stripe test checkout, cancellation and failure; the existing Stripe tests mock the provider.
- Physical QR camera scanning, browser permissions and decoder compatibility.
- Browser signup completion, signed-in order history, full game win/best-score/keyboard behaviour.
- Chrome/Safari/Firefox runs with recorded versions; physical devices, zoom, contrast and keyboard/screen-reader audit.
- W3C/Nu HTML, CSS validation and JavaScript linting were not run. Template compilation is a distinct check.
- Tests of absent login input, unknown-but-valid loyalty UUIDs and further model boundary values remain open.

## Final repository review

`git diff --check` and a check that every local Markdown file/image target exists are run before delivery; their results are recorded in `documentation-checks.txt`. No source model, payment, permission, authentication, cart or loyalty logic was changed. The sole application edit corrects the homepage's misleading five-stamp offer to match the existing eight-stamp scheme. The old submission ZIP was deliberately left untouched for review.
