from django.urls import path

from . import views

app_name = "cafe"

urlpatterns = [
  path("", views.home, name="home"),
  path("menu/", views.menu, name="menu"),
  path("cart/", views.cart_detail, name="cart"),
  path("cart/add/<int:item_id>/", views.add_to_cart, name="add_to_cart"),
  path("cart/update/<int:item_id>/", views.update_cart, name="update_cart"),
  path("checkout/", views.checkout, name="checkout"),
  path("orders/<int:pk>/<uuid:lookup_code>/", views.order_detail, name="order_detail"),
  path("loyalty/", views.loyalty, name="loyalty"),
  path("feedback/", views.feedback, name="feedback"),
  path("signup/", views.signup, name="signup"),
  path("staff/", views.staff_dashboard, name="staff_dashboard"),
  path("staff/orders/<int:pk>/status/", views.update_order_status, name="update_order_status"),
  path("staff/loyalty/scan/", views.scan_loyalty, name="scan_loyalty"),
  path("manager/", views.manager_dashboard, name="manager_dashboard"),
  path("manager/menu/new/", views.product_form, name="product_new"),
  path("manager/menu/<int:pk>/edit/", views.product_form, name="product_edit"),
  path("manager/menu/<int:pk>/toggle/", views.toggle_product, name="product_toggle"),
  path("health/", views.health, name="health"),
]
