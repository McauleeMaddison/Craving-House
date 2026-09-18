# Assessment testing evidence — 17–18 September 2026

The main [README](../../README.md#front-end-testing) contains the manual functional, responsive, form and user-story tables. This directory supplies reproducible commands and raw results. Tests used the current local source; no commit, push, deployment, production write or payment was performed.

## Initial environment

- macOS local workstation; Python 3.9.6; Django 4.2.30.
- All four pinned packages in `requirements.txt` installed in `/tmp/craving-docs-venv`.
- The original system Python initially lacked Django. The first package-install attempt failed because the sandbox could not reach the package index. Retrying with approved network access installed the requirements successfully. This was an environment issue, not an application test failure.
- Browser: Codex in-app browser; version not reported by the tool. Safari was subsequently exercised separately; Chrome, Firefox and Edge remain untested.
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

## Remaining checks after the follow-up

- Physical QR scanning, actual browser permission-denial feedback and decoder/device compatibility remain unverified. A Start camera attempt stayed at “Preparing camera scanner...” in the in-app browser; no physical success is claimed. Safari camera-prompt testing remains deferred. Independent manual entry succeeded (one stamp and one scan record).
- Physical touch gameplay and independent Chrome/Firefox/Edge runs remain untested.
- Full screen-reader, zoom and remaining gradient/control contrast review remain open. Automatic axe results include incomplete checks.
- The official Level 4 assessment brief is still required for a criterion-by-criterion mapping; the project has not received assessor sign-off.
- Live deployment must be checked against the reviewed source, particularly the cancellation fix.
- HTML/CSS validator and JavaScript lint checks were not run. Template compilation is a distinct check.

## Follow-up results

The follow-up retained the isolated SQLite database. Browser signup created a synthetic customer, rejected mismatched passwords, then displayed a zero-stamp card. A signed-in counter order appeared in that account's history; the earlier guest order did not. A full keyboard Boiler Buster round ended with score 222 and 76 vents, and reload retained best 222. These are genuine UI interactions; game state was not injected.

On 17 September the Render deployment opened Stripe **Sandbox**. The official decline card showed a decline message; the success card returned to the app with £3.10 paid. A separate sandbox cancellation lost order context, prompting the local cancel-URL/template fix and regression assertions. These two clearly named test orders affected Render's demonstration database; no real card was charged and no deployment was performed by the review. Card/payment data were not stored in the application.

Safari account/history checks ran on 17 September. Safari **27.0** was identified from its application metadata on 18 September and used for menu, AJAX add, cart and checkout display checks. These are narrower than full browser equivalence. The README browser table retains Chrome/Firefox/Edge as untested.

| Evidence | Scope |
| --- | --- |
| [final-regression.txt](final-regression.txt) | 44 tests passed on 18 September; original suite plus supplementary module, including cancellation assertions. |
| [final-collectstatic.txt](final-collectstatic.txt) | 138 copied, 404 post-processed with WhiteNoise manifest storage and a temporary output root. |
| [final-responsive-observations.json](final-responsive-observations.json) | Home/menu/populated cart/checkout at 375, 768 and 1440px after fixes; all twelve scroll widths within viewport. |
| [accessibility-audit.json](accessibility-audit.json) | axe-core 4.13.0 baseline and follow-up states. No automatic violations in follow-up; incomplete checks retained. |
| [contrast-results.json](contrast-results.json) / [calculation source](contrast_checks.py) | Conservative bounds for two corrected CSS pairs, not every element or a conformance certificate. |
| [signup-browser-snapshot.txt](signup-browser-snapshot.txt) | Successful signup and authenticated loyalty card. Mismatch error was also observed before correction. |
| [order-history-browser-snapshot.txt](order-history-browser-snapshot.txt) | Only the signed-in customer's order and tracking link. |
| [stripe-decline-snapshot.txt](stripe-decline-snapshot.txt) / [stripe-success-snapshot.txt](stripe-success-snapshot.txt) | Real external Sandbox decline and paid return. |
| [game-keyboard-win.txt](game-keyboard-win.txt) | Completed round, score/best 222 and 76 vents; reload persistence separately observed. |
| [manual-loyalty-result.txt](manual-loyalty-result.txt) | One-stamp manual submission and isolated database verification. |
| [safari-order-history.txt](safari-order-history.txt) / [safari-menu-cart-checkout.txt](safari-menu-cart-checkout.txt) | Native Safari observations. Diffs preserve the tool's observed state, not invented screenshots. |

### Accessibility method and limits

axe-core was downloaded from the official npm registry (`axe-core@4.13.0`) into a temporary directory and served by test-only middleware. For a repeat run, obtain the package with `npm pack axe-core@4.13.0`, extract it, and configure the local middleware's asset path. The production app does not load the audit library. Use the source in [audit_middleware.py](audit_middleware.py) only with disposable local test settings; add `docs.testing.audit_middleware.AuditMiddleware` to the local middleware list and open a page with `?audit=1`. Read the hidden `#assessment-audit` JSON after completion. The scan uses WCAG 2 A/AA, WCAG 2.1 AA and best-practice tags; it does not prove coverage of every criterion.

The follow-up used `StaticFilesStorage` and removed WhiteNoise middleware **only in temporary local settings**, plus versioned asset URLs, so cached collected files did not conceal CSS/JS edits. The release `collectstatic` check separately exercised the real WhiteNoise manifest storage. Baseline scans preceded fixes; labelled generic-group warnings in early loyalty/game scans are superseded by the later mobile scans after explicit group roles were added. Gradient contrast results were retained as incomplete. Silent live scanner preview was manually classified separately from prerecorded media caption requirements.

Mobile keyboard verification opened the drawer, observed focus on Close, verified inert background, wrapped Tab from Sign out to the first link and Shift+Tab back, then used Escape and observed focus return to Open menu. No screen-reader or physical touchscreen equivalence is claimed.

## Repository and archive review

No model/schema or role-predicate behaviour changed. The role module gained an explanatory docstring. Source fixes address confirmed heading/control semantics, drawer focus, form markup, affected contrast pairs and the observed Stripe cancellation context loss. The final 44-test run passed. The original screenshot set is retained as dated evidence; follow-up captures are indexed separately.

Build the source/evidence ZIP with `python3 scripts/build_submission.py`. The explicit allowlist excludes environment files, databases, Git metadata, caches and prior archives. The build verifies CRCs and all SHA-256 entries in `MANIFEST.sha256`. Read [the README's outstanding checks](../../README.md#known-issues-and-remaining-verification) before submission: successful packaging is not an assertion that every assessment requirement has been fulfilled.
