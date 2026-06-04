from decimal import Decimal

from .models import MenuItem

CART_SESSION_KEY = "cart"


def get_cart(request):
  return request.session.setdefault(CART_SESSION_KEY, {})


def set_cart(request, cart):
  cleaned = {str(item_id): int(quantity) for item_id, quantity in cart.items() if int(quantity) > 0}
  request.session[CART_SESSION_KEY] = cleaned
  request.session.modified = True


def cart_summary(request):
  cart = get_cart(request)
  ids = [int(item_id) for item_id in cart.keys()]
  items = MenuItem.objects.filter(id__in=ids, available=True).select_related("category")
  item_map = {str(item.id): item for item in items}
  lines = []
  subtotal = Decimal("0.00")
  prep_minutes = 0

  for item_id, quantity in cart.items():
    item = item_map.get(item_id)
    if not item:
      continue
    line_total = item.price * quantity
    subtotal += line_total
    prep_minutes += item.prep_minutes * quantity
    lines.append(
      {
        "item": item,
        "quantity": quantity,
        "line_total": line_total,
      }
    )

  return {
    "lines": lines,
    "subtotal": subtotal,
    "prep_minutes": prep_minutes,
    "count": sum(line["quantity"] for line in lines),
  }
