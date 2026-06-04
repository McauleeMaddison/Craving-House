from decimal import Decimal

from .models import MenuItem, MenuItemAddOn

CART_SESSION_KEY = "cart"


def build_cart_key(item_id, add_on_ids=None):
  cleaned_add_ons = sorted({int(add_on_id) for add_on_id in add_on_ids or []})
  if not cleaned_add_ons:
    return str(item_id)
  add_on_part = ",".join(str(add_on_id) for add_on_id in cleaned_add_ons)
  return f"{item_id}:{add_on_part}"


def parse_cart_key(line_key):
  item_part, _, add_on_part = str(line_key).partition(":")
  try:
    item_id = int(item_part)
  except ValueError:
    return None, []

  add_on_ids = []
  if add_on_part:
    for add_on_id in add_on_part.split(","):
      try:
        add_on_ids.append(int(add_on_id))
      except ValueError:
        continue

  return item_id, sorted(set(add_on_ids))


def get_cart(request):
  return request.session.setdefault(CART_SESSION_KEY, {})


def set_cart(request, cart):
  cleaned = {}
  for line_key, quantity in cart.items():
    try:
      clean_quantity = int(quantity)
    except (TypeError, ValueError):
      continue
    if clean_quantity > 0:
      cleaned[str(line_key)] = clean_quantity
  request.session[CART_SESSION_KEY] = cleaned
  request.session.modified = True


def cart_summary(request):
  cart = get_cart(request)
  parsed_lines = []
  item_ids = set()
  add_on_ids = set()

  for line_key in cart.keys():
    item_id, selected_add_on_ids = parse_cart_key(line_key)
    if item_id is None:
      continue
    parsed_lines.append((str(line_key), item_id, selected_add_on_ids))
    item_ids.add(item_id)
    add_on_ids.update(selected_add_on_ids)

  items = MenuItem.objects.filter(id__in=item_ids, available=True).select_related("category")
  item_map = {item.id: item for item in items}
  add_ons = MenuItemAddOn.objects.filter(id__in=add_on_ids, available=True)
  add_on_map = {add_on.id: add_on for add_on in add_ons}
  lines = []
  subtotal = Decimal("0.00")
  prep_minutes = 0

  for line_key, item_id, selected_add_on_ids in parsed_lines:
    item = item_map.get(item_id)
    if not item:
      continue

    quantity = int(cart.get(line_key, 0))
    selected_add_ons = [
      add_on
      for add_on_id in selected_add_on_ids
      if (add_on := add_on_map.get(add_on_id)) and add_on.menu_item_id == item.id
    ]
    add_on_total = sum((add_on.price for add_on in selected_add_ons), Decimal("0.00"))
    unit_price = item.price + add_on_total
    line_total = unit_price * quantity
    subtotal += line_total
    prep_minutes += item.prep_minutes * quantity
    lines.append(
      {
        "key": line_key,
        "item": item,
        "add_ons": selected_add_ons,
        "add_on_names": ", ".join(add_on.name for add_on in selected_add_ons),
        "add_on_total": add_on_total,
        "unit_price": unit_price,
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
