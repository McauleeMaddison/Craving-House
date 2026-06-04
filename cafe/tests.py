from decimal import Decimal

from django.contrib.auth.models import Group, User
from django.test import TestCase
from django.urls import reverse

from .models import MenuCategory, MenuItem, Order


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
    self.assertContains(response, "Add")

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
