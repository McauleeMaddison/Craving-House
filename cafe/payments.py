import json
import os
from decimal import Decimal
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


STRIPE_CHECKOUT_SESSIONS_URL = "https://api.stripe.com/v1/checkout/sessions"


class StripePaymentError(Exception):
  pass


def stripe_enabled():
  return bool(os.environ.get("STRIPE_SECRET_KEY", "").strip())


def _amount_to_pence(amount):
  return int((Decimal(amount) * Decimal("100")).quantize(Decimal("1")))


def _append_line_item(params, index, order_item):
  prefix = f"line_items[{index}]"
  params.append((f"{prefix}[quantity]", str(order_item.quantity)))
  params.append((f"{prefix}[price_data][currency]", "gbp"))
  params.append((f"{prefix}[price_data][unit_amount]", str(_amount_to_pence(order_item.unit_price))))
  params.append((f"{prefix}[price_data][product_data][name]", order_item.item_name[:120]))


def create_stripe_checkout_session(order, success_url, cancel_url):
  secret_key = os.environ.get("STRIPE_SECRET_KEY", "").strip()
  if not secret_key:
    raise StripePaymentError("Stripe is not configured.")

  params = [
    ("mode", "payment"),
    ("success_url", success_url),
    ("cancel_url", cancel_url),
    ("client_reference_id", str(order.pk)),
    ("metadata[order_id]", str(order.pk)),
    ("payment_intent_data[metadata][order_id]", str(order.pk)),
  ]

  if order.guest_email:
    params.append(("customer_email", order.guest_email))

  for index, order_item in enumerate(order.items.all()):
    _append_line_item(params, index, order_item)

  request = Request(
    STRIPE_CHECKOUT_SESSIONS_URL,
    data=urlencode(params).encode("utf-8"),
    headers={
      "Authorization": f"Bearer {secret_key}",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method="POST",
  )

  try:
    with urlopen(request, timeout=12) as response:
      payload = json.loads(response.read().decode("utf-8"))
  except HTTPError as error:
    try:
      payload = json.loads(error.read().decode("utf-8"))
      message = payload.get("error", {}).get("message") or "Stripe rejected the payment request."
    except (json.JSONDecodeError, UnicodeDecodeError):
      message = "Stripe rejected the payment request."
    raise StripePaymentError(message) from error
  except (URLError, TimeoutError) as error:
    raise StripePaymentError("Stripe could not be reached. Please try again.") from error
  except (json.JSONDecodeError, UnicodeDecodeError) as error:
    raise StripePaymentError("Stripe returned an invalid response.") from error

  checkout_url = payload.get("url")
  if not checkout_url:
    raise StripePaymentError("Stripe did not return a checkout URL.")

  return checkout_url
