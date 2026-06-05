from .cart import cart_summary
from .roles import is_manager, is_staff_member, role_label


def cart(request):
  if not hasattr(request, "session"):
    cart_count = 0
  else:
    cart_count = cart_summary(request)["count"]

  user = getattr(request, "user", None)
  return {
    "cart_count": cart_count,
    "can_access_staff": bool(user and user.is_authenticated and is_staff_member(user)),
    "can_access_manager": bool(user and user.is_authenticated and is_manager(user)),
    "user_role_label": role_label(user) if user else "",
  }
