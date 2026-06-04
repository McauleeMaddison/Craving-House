from .cart import cart_summary


def cart(request):
  if not hasattr(request, "session"):
    return {"cart_count": 0}
  return {"cart_count": cart_summary(request)["count"]}
