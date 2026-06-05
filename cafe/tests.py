from decimal import Decimal
from datetime import timedelta
import os
from pathlib import Path
from unittest.mock import patch

from django.contrib.auth.models import Group, User
from django.templatetags.static import static
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from .models import CustomerProfile, LoyaltyScan, MenuCategory, MenuItem, MenuItemAddOn, Order


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
    cls.add_on = MenuItemAddOn.objects.create(
      menu_item=cls.item,
      name="Oat milk",
      price=Decimal("0.50"),
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
        "add_on_names": [],
        "item_quantity": 2,
        "cart_count": 2,
      },
    )

  def test_add_ons_are_added_to_cart_line_total(self):
    response = self.client.post(
      reverse("cafe:add_to_cart", args=[self.item.id]),
      {"quantity": "2", "add_ons": [str(self.add_on.id)]},
      HTTP_X_REQUESTED_WITH="XMLHttpRequest",
      HTTP_ACCEPT="application/json",
    )

    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.json()["add_on_names"], ["Oat milk"])

    cart_response = self.client.get(reverse("cafe:cart"))
    self.assertContains(cart_response, "Oat milk +£0.50")
    self.assertContains(cart_response, "£8.60")

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

  def test_guest_home_loyalty_progress_stays_empty(self):
    response = self.client.get(reverse("cafe:home"))

    self.assertEqual(response.status_code, 200)
    self.assertContains(response, "Sign in to start tracking your stamps.")
    self.assertContains(response, 'value="0"')
    self.assertContains(response, 'max="8"')

  def test_public_navigation_only_shows_sign_in_account_action(self):
    response = self.client.get(reverse("cafe:home"))

    self.assertEqual(response.status_code, 200)
    self.assertContains(response, 'href="/accounts/login/"')
    self.assertContains(response, '<span class="drawerLinkLabel">Sign in</span>', html=True)
    self.assertNotContains(response, 'href="/signup/"')
    self.assertNotContains(response, "Create account")

  def test_shared_shell_uses_app_branding_and_logo_icons(self):
    response = self.client.get(reverse("cafe:home"))
    logo_url = static("brand/ch-logo.png")

    self.assertEqual(response.status_code, 200)
    self.assertContains(response, "Craving House Coffee App")
    self.assertContains(response, f'rel="icon" type="image/png" href="{logo_url}"')
    self.assertContains(response, f'rel="apple-touch-icon" href="{logo_url}"')
    self.assertNotContains(response, "Craving House Django project")

  def test_home_cart_shortcut_replaces_my_card_and_uses_cart_badge(self):
    self.client.post(reverse("cafe:add_to_cart", args=[self.item.id]), {"quantity": "1"})

    response = self.client.get(reverse("cafe:home"))

    self.assertEqual(response.status_code, 200)
    self.assertContains(response, 'class="dashCtaSmall dashCtaCart" href="/cart/"')
    self.assertContains(response, '<span class="dashCtaSmallTitle">Cart</span>', html=True)
    self.assertContains(response, 'class="dashCartBadge" data-cart-count aria-label="1 items in cart"')
    self.assertNotContains(response, "My card")
    self.assertNotContains(response, "navMobileBadge")

  def test_signed_in_home_loyalty_progress_uses_tracked_profile(self):
    user = User.objects.create_user("trackedcustomer", password="CustomerPass123")
    CustomerProfile.objects.create(user=user, stamps=3)
    self.client.force_login(user)

    response = self.client.get(reverse("cafe:home"))

    self.assertEqual(response.status_code, 200)
    self.assertContains(response, "3 of 8 stamps collected.")
    self.assertContains(response, 'value="3"')
    self.assertContains(response, 'max="8"')

  def test_signed_in_home_without_loyalty_profile_stays_empty(self):
    user = User.objects.create_user("untrackedcustomer", password="CustomerPass123")
    self.client.force_login(user)

    response = self.client.get(reverse("cafe:home"))

    self.assertEqual(response.status_code, 200)
    self.assertContains(response, "Sign in to start tracking your stamps.")
    self.assertContains(response, 'value="0"')

  def test_checkout_creates_order_from_session_cart(self):
    self.client.post(
      reverse("cafe:add_to_cart", args=[self.item.id]),
      {"quantity": "2", "add_ons": [str(self.add_on.id)]},
    )

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
    self.assertEqual(order.subtotal, Decimal("8.60"))
    self.assertEqual(order.prep_minutes, 8)
    self.assertEqual(order.items.count(), 1)
    self.assertEqual(order.payment_method, Order.PaymentMethod.COUNTER)
    self.assertEqual(order.payment_status, Order.PaymentStatus.DUE)
    order_item = order.items.get()
    self.assertEqual(order_item.unit_price, Decimal("4.30"))
    self.assertEqual(order_item.add_on_total, Decimal("0.50"))
    self.assertEqual(order_item.add_on_names, "Oat milk")

  def test_stripe_checkout_creates_pending_card_order(self):
    self.client.post(reverse("cafe:add_to_cart", args=[self.item.id]), {"quantity": "1"})

    with patch.dict(os.environ, {"STRIPE_SECRET_KEY": "sk_test_fake"}), patch(
      "cafe.views.create_stripe_checkout_session",
      return_value={"id": "cs_test_123", "url": "https://checkout.stripe.test/session"},
    ) as create_session:
      response = self.client.post(
        reverse("cafe:checkout"),
        {
          "name": "Sam Customer",
          "email": "sam@example.com",
          "phone": "07123456789",
          "notes": "",
          "payment_method": "stripe",
        },
      )

    order = Order.objects.get()
    success_url = create_session.call_args.args[1]
    self.assertRedirects(response, "https://checkout.stripe.test/session", fetch_redirect_response=False)
    self.assertEqual(order.payment_method, Order.PaymentMethod.STRIPE)
    self.assertEqual(order.payment_status, Order.PaymentStatus.PENDING)
    self.assertEqual(order.stripe_checkout_session_id, "cs_test_123")
    self.assertIn("stripe_session_id={CHECKOUT_SESSION_ID}", success_url)

  def test_order_detail_marks_confirmed_stripe_payment_successful(self):
    order = Order.objects.create(
      guest_name="Sam Customer",
      guest_email="sam@example.com",
      payment_method=Order.PaymentMethod.STRIPE,
      payment_status=Order.PaymentStatus.PENDING,
      subtotal=Decimal("5.20"),
      prep_minutes=4,
    )

    with patch(
      "cafe.views.retrieve_stripe_checkout_session",
      return_value={
        "id": "cs_test_paid",
        "client_reference_id": str(order.pk),
        "payment_status": "paid",
      },
    ):
      response = self.client.get(
        reverse("cafe:order_detail", args=[order.pk, order.lookup_code]),
        {"stripe_session_id": "cs_test_paid"},
      )

    order.refresh_from_db()
    self.assertEqual(response.status_code, 200)
    self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)
    self.assertEqual(order.stripe_checkout_session_id, "cs_test_paid")
    self.assertContains(response, "Payment successful")
    self.assertContains(response, "Total paid by card")
    self.assertNotContains(response, "Total due at collection")

  def test_order_history_requires_login(self):
    response = self.client.get(reverse("cafe:order_history"))

    self.assertEqual(response.status_code, 302)
    self.assertIn("/accounts/login/", response["Location"])

  def test_order_history_shows_only_eight_most_recent_customer_orders(self):
    customer = User.objects.create_user("ordercustomer", password="CustomerPass123")
    other_customer = User.objects.create_user("othercustomer", password="CustomerPass123")
    base_time = timezone.now()
    created_orders = []

    for index in range(10):
      order = Order.objects.create(
        customer=customer,
        guest_name=f"Order Customer {index}",
        guest_email="ordercustomer@example.com",
        status=Order.Status.READY if index == 9 else Order.Status.PLACED,
        payment_status=Order.PaymentStatus.PAID if index == 8 else Order.PaymentStatus.DUE,
        subtotal=Decimal("3.50") + Decimal(index),
        prep_minutes=4,
      )
      Order.objects.filter(pk=order.pk).update(created_at=base_time + timedelta(minutes=index))
      created_orders.append(order)

    other_order = Order.objects.create(
      customer=other_customer,
      guest_name="Other Customer",
      guest_email="other@example.com",
      subtotal=Decimal("99.00"),
      prep_minutes=4,
    )
    Order.objects.filter(pk=other_order.pk).update(created_at=base_time + timedelta(minutes=20))

    self.client.force_login(customer)
    response = self.client.get(reverse("cafe:order_history"))

    order_ids = [order.pk for order in response.context["orders"]]
    expected_ids = [order.pk for order in reversed(created_orders[-8:])]
    self.assertEqual(response.status_code, 200)
    self.assertEqual(order_ids, expected_ids)
    self.assertNotIn(other_order.pk, order_ids)
    self.assertContains(response, "Track your orders")
    self.assertContains(response, "Ready for collection")
    self.assertContains(response, "Paid by card")
    self.assertContains(response, "Track order", count=8)

  def test_signed_in_checkout_order_appears_in_order_history(self):
    user = User.objects.create_user("checkoutcustomer", email="checkout@example.com", password="CustomerPass123")
    self.client.force_login(user)
    self.client.post(reverse("cafe:add_to_cart", args=[self.item.id]), {"quantity": "1"})

    response = self.client.post(
      reverse("cafe:checkout"),
      {
        "name": "Checkout Customer",
        "email": "checkout@example.com",
        "phone": "07123456789",
        "notes": "",
      },
    )

    order = Order.objects.get(guest_name="Checkout Customer")
    history_response = self.client.get(reverse("cafe:order_history"))

    self.assertRedirects(response, reverse("cafe:order_detail", args=[order.pk, order.lookup_code]))
    self.assertEqual(order.customer, user)
    self.assertContains(history_response, f"Order #{order.pk}")
    self.assertContains(history_response, "Pay at counter")

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
    self.assertContains(response, "Service dashboard")
    self.assertContains(response, "Staff only")
    self.assertContains(response, "Order station")
    self.assertContains(response, "Loyalty station")
    self.assertContains(response, "data-loyalty-scanner")
    self.assertEqual(
      response.context["staff_stats"],
      {"active": 0, "preparing": 0, "ready": 0, "paid": 0},
    )

  def test_staff_scanner_javascript_has_cross_browser_qr_fallback(self):
    scanner_script = Path(__file__).resolve().parent.parent / "static" / "django" / "js" / "app.js"
    script = scanner_script.read_text()

    self.assertIn("BarcodeDetector", script)
    self.assertIn("jsQR", script)
    self.assertIn("vendor/jsqr/jsQR.js", script)
    self.assertIn("Scanning in compatibility mode", script)
    self.assertIn("Camera scanning needs HTTPS", script)

  def test_staff_portal_hides_customer_navigation_links(self):
    group = Group.objects.create(name="Staff")
    user = User.objects.create_user("staffportal", password="StaffPass123")
    user.groups.add(group)
    self.client.force_login(user)

    response = self.client.get(reverse("cafe:staff_dashboard"))

    self.assertEqual(response.status_code, 200)
    self.assertContains(response, '<span class="appHeaderMenuLabel">Portal</span>', html=True)
    self.assertContains(response, reverse("cafe:staff_dashboard"))
    self.assertNotContains(response, 'href="/menu/"')
    self.assertNotContains(response, 'href="/cart/"')
    self.assertNotContains(response, 'href="/loyalty/"')
    self.assertNotContains(response, 'href="/orders/"')
    self.assertNotContains(response, 'href="/feedback/"')
    self.assertNotContains(response, 'href="/boiler-buster/"')

  def test_staff_group_user_sees_staff_navigation(self):
    group = Group.objects.create(name="Staff")
    user = User.objects.create_user("staffnav", password="StaffPass123")
    user.groups.add(group)
    self.client.force_login(user)

    response = self.client.get(reverse("cafe:home"))

    self.assertEqual(response.status_code, 200)
    self.assertContains(response, "Welcome, staffnav · Staff")
    self.assertContains(response, reverse("cafe:staff_dashboard"))
    self.assertNotContains(response, reverse("cafe:manager_dashboard"))

  def test_staff_group_user_cannot_access_manager_dashboard(self):
    group = Group.objects.create(name="Staff")
    user = User.objects.create_user("staffonly", password="StaffPass123")
    user.groups.add(group)
    self.client.force_login(user)

    response = self.client.get(reverse("cafe:manager_dashboard"))

    self.assertEqual(response.status_code, 302)
    self.assertIn("/accounts/login/", response["Location"])

  def test_manager_group_user_can_access_manager_dashboard_and_navigation(self):
    group = Group.objects.create(name="Manager")
    user = User.objects.create_user("manageruser", password="ManagerPass123")
    user.groups.add(group)
    self.client.force_login(user)

    response = self.client.get(reverse("cafe:manager_dashboard"))
    home_response = self.client.get(reverse("cafe:home"))

    self.assertEqual(response.status_code, 200)
    self.assertContains(response, "Menu and operations")
    self.assertContains(home_response, "Welcome, manageruser · Manager")
    self.assertContains(home_response, reverse("cafe:staff_dashboard"))
    self.assertContains(home_response, reverse("cafe:manager_dashboard"))

  def test_manager_portal_hides_customer_navigation_links(self):
    group = Group.objects.create(name="Manager")
    user = User.objects.create_user("managerportal", password="ManagerPass123")
    user.groups.add(group)
    self.client.force_login(user)

    response = self.client.get(reverse("cafe:manager_dashboard"))

    self.assertEqual(response.status_code, 200)
    self.assertContains(response, '<span class="appHeaderMenuLabel">Portal</span>', html=True)
    self.assertContains(response, reverse("cafe:staff_dashboard"))
    self.assertContains(response, reverse("cafe:manager_dashboard"))
    self.assertNotContains(response, 'href="/menu/"')
    self.assertNotContains(response, 'href="/cart/"')
    self.assertNotContains(response, 'href="/loyalty/"')
    self.assertNotContains(response, 'href="/orders/"')
    self.assertNotContains(response, 'href="/feedback/"')
    self.assertNotContains(response, 'href="/boiler-buster/"')

  def test_manager_group_user_can_delete_menu_item(self):
    group = Group.objects.create(name="Manager")
    user = User.objects.create_user("managerdelete", password="ManagerPass123")
    user.groups.add(group)
    self.client.force_login(user)

    response = self.client.post(reverse("cafe:product_delete", args=[self.item.pk]))

    self.assertRedirects(response, reverse("cafe:manager_dashboard"))
    self.assertFalse(MenuItem.objects.filter(pk=self.item.pk).exists())

  def test_customer_loyalty_card_renders_local_qr_code(self):
    user = User.objects.create_user("customerqr", password="CustomerPass123")
    profile = CustomerProfile.objects.create(user=user)
    self.client.force_login(user)

    response = self.client.get(reverse("cafe:loyalty"))

    self.assertEqual(response.status_code, 200)
    self.assertContains(response, str(profile.card_code))
    self.assertContains(response, 'class="loyaltyQr"')
    self.assertContains(response, "Show this card at pickup.")

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
    self.assertTrue(LoyaltyScan.objects.filter(profile=profile, staff_user=staff_user, stamps_added=3).exists())

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
