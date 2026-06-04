from decimal import Decimal

from django.contrib.auth.models import Group, User
from django.test import TestCase
from django.urls import reverse

from .models import CustomerProfile, MenuCategory, MenuItem, Order


class CafeFlowTests(TestCase):
  @classmethod
  def setUpTestData(cls):
    category = MenuCategory.objects.create(name="Coffee", display_order=1)
    cls.item = MenuItem.objects.create(
      category=category,
      name="House Latte",
      description="Double espresso with steamed milk.",
      price=Decimal("3.80"),
      prep_minutes=4,
      featured=True,
    )

  def test_menu_page_lists_available_items(self):
    response = self.client.get(reverse("cafe:menu"))

    self.assertEqual(response.status_code, 200)
    self.assertContains(response, "House Latte")
    self.assertContains(response, "Add to cart")

  def test_ajax_add_to_cart_returns_live_cart_payload(self):
    response = self.client.post(
      reverse("cafe:add_to_cart", args=[self.item.id]),
      {"quantity": "2"},
      HTTP_X_REQUESTED_WITH="XMLHttpRequest",
      HTTP_ACCEPT="application/json",
    )

    self.assertEqual(response.status_code, 200)
    self.assertEqual(
      response.json(),
      {
        "ok": True,
        "item_name": "House Latte",
        "item_quantity": 2,
        "cart_count": 2,
      },
    )

  def test_public_user_can_create_account_and_sees_welcome_username(self):
    response = self.client.post(
      reverse("cafe:signup"),
      {
        "username": "newcustomer",
        "email": "newcustomer@example.com",
        "password1": "CustomerPass123!",
        "password2": "CustomerPass123!",
      },
    )

    user = User.objects.get(username="newcustomer")
    self.assertRedirects(response, reverse("cafe:loyalty"))
    self.assertTrue(CustomerProfile.objects.filter(user=user).exists())

    home_response = self.client.get(reverse("cafe:home"))
    self.assertContains(home_response, "Welcome, newcustomer")

  def test_checkout_creates_order_from_session_cart(self):
    self.client.post(reverse("cafe:add_to_cart", args=[self.item.id]), {"quantity": "2"})

    response = self.client.post(
      reverse("cafe:checkout"),
      {
        "name": "Sam Customer",
        "email": "sam@example.com",
        "phone": "07123456789",
        "notes": "Oat milk.",
      },
    )

    order = Order.objects.get()
    self.assertRedirects(
      response,
      reverse("cafe:order_detail", args=[order.pk, order.lookup_code]),
    )
    self.assertEqual(order.subtotal, Decimal("7.60"))
    self.assertEqual(order.prep_minutes, 8)
    self.assertEqual(order.items.count(), 1)

  def test_staff_dashboard_requires_staff_access(self):
    user = User.objects.create_user("customer", password="CustomerPass123")
    self.client.force_login(user)

    response = self.client.get(reverse("cafe:staff_dashboard"))

    self.assertEqual(response.status_code, 302)
    self.assertIn("/accounts/login/", response["Location"])

  def test_staff_member_can_view_dashboard(self):
    group = Group.objects.create(name="Staff")
    user = User.objects.create_user("staff", password="StaffPass123")
    user.groups.add(group)
    self.client.force_login(user)

    response = self.client.get(reverse("cafe:staff_dashboard"))

    self.assertEqual(response.status_code, 200)
    self.assertContains(response, "Order queue")

  def test_staff_member_can_add_loyalty_stamps_to_customer_card(self):
    group = Group.objects.create(name="Staff")
    staff_user = User.objects.create_user("staff", password="StaffPass123")
    staff_user.groups.add(group)
    customer = User.objects.create_user("customer", password="CustomerPass123")
    profile = CustomerProfile.objects.create(user=customer)
    self.client.force_login(staff_user)

    response = self.client.post(
      reverse("cafe:scan_loyalty"),
      {"card_code": str(profile.card_code), "stamps": "3"},
    )

    profile.refresh_from_db()
    self.assertRedirects(response, reverse("cafe:staff_dashboard"))
    self.assertEqual(profile.stamps, 3)

  def test_health_endpoint_identifies_django(self):
    response = self.client.get(reverse("cafe:health"))

    self.assertEqual(response.json(), {"status": "ok", "framework": "Django"})

  def test_boiler_buster_game_page_loads(self):
    response = self.client.get(reverse("cafe:boiler_buster"))

    self.assertEqual(response.status_code, 200)
    self.assertContains(response, "Boiler Buster")
    self.assertContains(response, "data-boiler-buster")

  def test_old_clicker_url_redirects_to_boiler_buster(self):
    response = self.client.get(reverse("cafe:clicker"))

    self.assertRedirects(response, reverse("cafe:boiler_buster"))
