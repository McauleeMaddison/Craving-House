from .cart import cart_summary
from .roles import is_manager, is_staff_member, role_label


OPERATIONS_PORTAL_URL_NAMES = {
  "staff_dashboard",
  "manager_dashboard",
  "product_new",
  "product_edit",
}


def cart(request):
  if not hasattr(request, "session"):
    cart_count = 0
  else:
    cart_count = cart_summary(request)["count"]

  user = getattr(request, "user", None)
  resolver_match = getattr(request, "resolver_match", None)
  is_operations_portal = bool(
    resolver_match and resolver_match.url_name in OPERATIONS_PORTAL_URL_NAMES
  )

  return {
    "cart_count": cart_count,
    "can_access_staff": bool(user and user.is_authenticated and is_staff_member(user)),
    "can_access_manager": bool(user and user.is_authenticated and is_manager(user)),
    "is_operations_portal": is_operations_portal,
    "user_role_label": role_label(user) if user else "",
  }
