from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required, user_passes_test
from django.db import transaction
from django.db.models import Sum
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_POST

from .cart import build_cart_key, cart_summary, get_cart, set_cart
from .forms import CheckoutForm, FeedbackForm, LoyaltyScanForm, MenuItemForm, SignUpForm
from .models import CustomerProfile, Feedback, LoyaltyScan, MenuCategory, MenuItem, Order, OrderItem
from .payments import (
  StripePaymentError,
  create_stripe_checkout_session,
  retrieve_stripe_checkout_session,
  stripe_enabled,
)
from .qr import make_qr_svg
from .roles import is_manager, is_staff_member


staff_required = user_passes_test(is_staff_member, login_url="login")
manager_required = user_passes_test(is_manager, login_url="login")


def home(request):
  if request.user.is_authenticated:
    if is_manager(request.user):
      return redirect("cafe:manager_dashboard")
    if is_staff_member(request.user):
      return redirect("cafe:staff_dashboard")

  featured_items = MenuItem.objects.filter(available=True, featured=True).select_related("category")[:6]
  if not featured_items:
    featured_items = MenuItem.objects.filter(available=True).select_related("category")[:6]

  loyalty_stamps = 0
  loyalty_is_tracked = False
  if request.user.is_authenticated:
    profile = CustomerProfile.objects.filter(user=request.user).only("stamps").first()
    if profile:
      loyalty_stamps = profile.stamps
      loyalty_is_tracked = True

  loyalty_stamps_required = CustomerProfile.LOYALTY_STAMPS_REQUIRED

  context = {
    "featured_items": featured_items,
    "active_order_count": Order.objects.exclude(
      status__in=[Order.Status.COLLECTED, Order.Status.CANCELLED]
    ).count(),
    "loyalty_is_tracked": loyalty_is_tracked,
    "loyalty_stamps": loyalty_stamps,
    "loyalty_stamps_required": loyalty_stamps_required,
  }
  return render(request, "cafe/home.html", context)


def menu(request):
  categories = MenuCategory.objects.prefetch_related("items__add_ons")
  return render(request, "cafe/menu.html", {"categories": categories})


@require_POST
def add_to_cart(request, item_id):
  item = get_object_or_404(MenuItem.objects.prefetch_related("add_ons"), pk=item_id, available=True)
  try:
    quantity = max(1, min(20, int(request.POST.get("quantity", "1"))))
  except ValueError:
    quantity = 1
  selected_add_on_ids = {
    int(add_on_id)
    for add_on_id in request.POST.getlist("add_ons")
    if str(add_on_id).isdigit()
  }
  allowed_add_on_ids = set(
    item.add_ons.filter(available=True, id__in=selected_add_on_ids).values_list("id", flat=True)
  )
  line_key = build_cart_key(item.id, allowed_add_on_ids)
  cart = get_cart(request)
  cart[line_key] = min(20, int(cart.get(line_key, 0)) + quantity)
  set_cart(request, cart)

  if request.headers.get("x-requested-with") == "XMLHttpRequest":
    summary = cart_summary(request)
    add_on_names = [
      add_on.name
      for line in summary["lines"]
      if line["key"] == line_key
      for add_on in line["add_ons"]
    ]
    return JsonResponse(
      {
        "ok": True,
        "item_name": item.name,
        "add_on_names": add_on_names,
        "item_quantity": cart[line_key],
        "cart_count": summary["count"],
      }
    )

  messages.success(request, f"Added {item.name} to your order.")
  return redirect(request.POST.get("next") or "cafe:menu")


def cart_detail(request):
  return render(request, "cafe/cart.html", {"summary": cart_summary(request)})


@require_POST
def update_cart(request, line_key):
  cart = get_cart(request)
  action = request.POST.get("action")

  if action == "remove":
    cart.pop(str(line_key), None)
  else:
    try:
      quantity = int(request.POST.get("quantity", "1"))
    except ValueError:
      quantity = 1
    if quantity <= 0:
      cart.pop(str(line_key), None)
    else:
      cart[str(line_key)] = min(20, quantity)

  set_cart(request, cart)
  return redirect("cafe:cart")


def create_order_from_cart(request, form, summary, payment_method=Order.PaymentMethod.COUNTER):
  payment_status = Order.PaymentStatus.DUE
  if payment_method == Order.PaymentMethod.STRIPE:
    payment_status = Order.PaymentStatus.PENDING

  with transaction.atomic():
    order = Order.objects.create(
      customer=request.user if request.user.is_authenticated else None,
      guest_name=form.cleaned_data["name"],
      guest_email=form.cleaned_data["email"],
      guest_phone=form.cleaned_data["phone"],
      payment_method=payment_method,
      payment_status=payment_status,
      notes=form.cleaned_data["notes"],
    )
    for line in summary["lines"]:
      item = line["item"]
      OrderItem.objects.create(
        order=order,
        menu_item=item,
        item_name=item.name,
        add_on_names=line["add_on_names"],
        add_on_total=line["add_on_total"],
        quantity=line["quantity"],
        unit_price=line["unit_price"],
        prep_minutes_each=item.prep_minutes,
        line_total=line["line_total"],
      )
    order.recalculate_totals()
  return order


def checkout(request):
  summary = cart_summary(request)
  if not summary["lines"]:
    messages.info(request, "Add an item before checking out.")
    return redirect("cafe:menu")

  initial = {}
  if request.user.is_authenticated:
    initial = {
      "name": request.user.get_full_name() or request.user.username,
      "email": request.user.email,
    }

  can_use_stripe = stripe_enabled()
  form = CheckoutForm(request.POST or None, initial=initial)
  if request.method == "POST" and form.is_valid():
    payment_method = request.POST.get("payment_method", "counter")
    if payment_method not in [Order.PaymentMethod.COUNTER, Order.PaymentMethod.STRIPE]:
      payment_method = Order.PaymentMethod.COUNTER
    if payment_method == "stripe" and not can_use_stripe:
      messages.error(request, "Stripe test payments are not configured for this deployment.")
      return render(request, "cafe/checkout.html", {"form": form, "summary": summary, "stripe_enabled": can_use_stripe})

    order = create_order_from_cart(request, form, summary, payment_method=payment_method)

    if payment_method == "stripe":
      success_url = request.build_absolute_uri(
        reverse("cafe:order_detail", args=[order.pk, order.lookup_code])
      ) + "?stripe_session_id={CHECKOUT_SESSION_ID}"
      cancel_url = request.build_absolute_uri(reverse("cafe:checkout"))
      try:
        stripe_checkout_session = create_stripe_checkout_session(order, success_url, cancel_url)
      except StripePaymentError as error:
        order.delete()
        messages.error(request, str(error))
        return render(request, "cafe/checkout.html", {"form": form, "summary": summary, "stripe_enabled": can_use_stripe})

      order.stripe_checkout_session_id = stripe_checkout_session.get("id", "")
      order.save(update_fields=["stripe_checkout_session_id", "updated_at"])
      set_cart(request, {})
      return redirect(stripe_checkout_session["url"])

    set_cart(request, {})
    messages.success(request, "Order placed. Pay at the counter when you collect.")
    return redirect("cafe:order_detail", pk=order.pk, lookup_code=order.lookup_code)

  return render(request, "cafe/checkout.html", {"form": form, "summary": summary, "stripe_enabled": can_use_stripe})


def order_detail(request, pk, lookup_code):
  order = get_object_or_404(
    Order.objects.prefetch_related("items"),
    pk=pk,
    lookup_code=lookup_code,
  )
  stripe_session_id = request.GET.get("stripe_session_id", "").strip()
  payment_check_error = ""

  if (
    stripe_session_id
    and order.payment_method == Order.PaymentMethod.STRIPE
    and order.payment_status != Order.PaymentStatus.PAID
  ):
    try:
      stripe_session = retrieve_stripe_checkout_session(stripe_session_id)
    except StripePaymentError as error:
      payment_check_error = str(error)
    else:
      if (
        stripe_session.get("client_reference_id") == str(order.pk)
        and stripe_session.get("payment_status") == "paid"
      ):
        order.payment_status = Order.PaymentStatus.PAID
        order.stripe_checkout_session_id = stripe_session.get("id", stripe_session_id)
        order.save(update_fields=["payment_status", "stripe_checkout_session_id", "updated_at"])
      else:
        payment_check_error = "Stripe has not confirmed this card payment yet."

  return render(
    request,
    "cafe/order_detail.html",
    {"order": order, "payment_check_error": payment_check_error},
  )


@login_required
def order_history(request):
  orders = (
    Order.objects.filter(customer=request.user)
    .prefetch_related("items")
    .order_by("-created_at")[:8]
  )
  return render(request, "cafe/order_history.html", {"orders": orders})


@login_required
def loyalty(request):
  profile, _ = CustomerProfile.objects.get_or_create(user=request.user)
  stamp_range = range(CustomerProfile.LOYALTY_STAMPS_REQUIRED)
  card_code = str(profile.card_code)
  return render(
    request,
    "cafe/loyalty.html",
    {
      "profile": profile,
      "loyalty_qr_svg": make_qr_svg(card_code),
      "stamp_range": stamp_range,
      "stamps_required": CustomerProfile.LOYALTY_STAMPS_REQUIRED,
    },
  )


def boiler_buster(request):
  return render(request, "cafe/clicker.html")


def clicker(request):
  return redirect("cafe:boiler_buster")


def feedback(request):
  form = FeedbackForm(request.POST or None)
  if request.method == "POST" and form.is_valid():
    form.save()
    messages.success(request, "Thanks for the feedback. The manager can review it in admin.")
    return redirect("cafe:feedback")
  return render(request, "cafe/feedback.html", {"form": form})


def signup(request):
  form = SignUpForm(request.POST or None)
  if request.method == "POST" and form.is_valid():
    user = form.save(commit=False)
    user.email = form.cleaned_data["email"]
    user.save()
    CustomerProfile.objects.create(user=user)
    login(request, user)
    messages.success(request, "Account created. Your loyalty card is ready.")
    return redirect("cafe:loyalty")
  return render(request, "registration/signup.html", {"form": form})


@staff_required
def staff_dashboard(request):
  active_orders = Order.objects.exclude(
    status__in=[Order.Status.COLLECTED, Order.Status.CANCELLED]
  ).prefetch_related("items").order_by("created_at")
  scan_form = LoyaltyScanForm()
  staff_stats = {
    "active": active_orders.count(),
    "placed": active_orders.filter(status=Order.Status.PLACED).count(),
    "preparing": active_orders.filter(status=Order.Status.PREPARING).count(),
    "ready": active_orders.filter(status=Order.Status.READY).count(),
    "paid": active_orders.filter(payment_status=Order.PaymentStatus.PAID).count(),
    "counter_due": active_orders.filter(payment_status=Order.PaymentStatus.DUE).count(),
    "card_pending": active_orders.filter(payment_status=Order.PaymentStatus.PENDING).count(),
  }
  return render(
    request,
    "cafe/staff_dashboard.html",
    {
      "orders": active_orders,
      "next_order": active_orders.first(),
      "status_choices": Order.Status.choices,
      "scan_form": scan_form,
      "staff_stats": staff_stats,
    },
  )


@require_POST
@staff_required
def update_order_status(request, pk):
  order = get_object_or_404(Order, pk=pk)
  status = request.POST.get("status")
  valid_statuses = {choice[0] for choice in Order.Status.choices}
  if status in valid_statuses:
    order.status = status
    order.save(update_fields=["status", "updated_at"])
    messages.success(request, f"Order #{order.pk} marked {order.get_status_display().lower()}.")
  else:
    messages.error(request, "That order status is not valid.")
  return redirect("cafe:staff_dashboard")


@require_POST
@staff_required
def scan_loyalty(request):
  form = LoyaltyScanForm(request.POST)
  if form.is_valid():
    profile = get_object_or_404(CustomerProfile, card_code=form.cleaned_data["card_code"])
    stamps = form.cleaned_data["stamps"]
    profile.add_stamps(stamps)
    LoyaltyScan.objects.create(
      profile=profile,
      staff_user=request.user,
      stamps_added=stamps,
    )
    messages.success(request, f"Added {stamps} stamp(s) to {profile.user.username}.")
  else:
    messages.error(request, "Enter a valid loyalty card code and stamp count.")
  return redirect("cafe:staff_dashboard")


@manager_required
def manager_dashboard(request):
  items = MenuItem.objects.select_related("category")
  metrics = {
    "orders": Order.objects.count(),
    "revenue": Order.objects.aggregate(total=Sum("subtotal"))["total"] or 0,
    "feedback": Feedback.objects.count(),
    "active_items": items.filter(available=True).count(),
  }
  return render(
    request,
    "cafe/manager_dashboard.html",
    {"items": items, "metrics": metrics},
  )


@manager_required
def product_form(request, pk=None):
  product = get_object_or_404(MenuItem, pk=pk) if pk else None
  form = MenuItemForm(request.POST or None, instance=product)
  if request.method == "POST" and form.is_valid():
    product = form.save()
    messages.success(request, f"Saved {product.name}.")
    return redirect("cafe:manager_dashboard")
  return render(request, "cafe/product_form.html", {"form": form, "product": product})


@require_POST
@manager_required
def toggle_product(request, pk):
  product = get_object_or_404(MenuItem, pk=pk)
  product.available = not product.available
  product.save(update_fields=["available", "updated_at"])
  state = "available" if product.available else "hidden"
  messages.success(request, f"{product.name} is now {state}.")
  return redirect("cafe:manager_dashboard")


@require_POST
@manager_required
def delete_product(request, pk):
  product = get_object_or_404(MenuItem, pk=pk)
  product_name = product.name
  product.delete()
  messages.success(request, f"Deleted {product_name}.")
  return redirect("cafe:manager_dashboard")


def health(request):
  return JsonResponse({"status": "ok", "framework": "Django"})
