from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.models import Group
from django.db import transaction
from django.db.models import Sum
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .cart import cart_summary, get_cart, set_cart
from .forms import CheckoutForm, FeedbackForm, LoyaltyScanForm, MenuItemForm, SignUpForm
from .models import CustomerProfile, Feedback, LoyaltyScan, MenuCategory, MenuItem, Order, OrderItem


def is_staff_member(user):
  return user.is_active and (
    user.is_staff
    or user.groups.filter(name__in=["Staff", "Manager"]).exists()
  )


def is_manager(user):
  return user.is_active and (
    user.is_superuser
    or user.groups.filter(name="Manager").exists()
  )


staff_required = user_passes_test(is_staff_member, login_url="login")
manager_required = user_passes_test(is_manager, login_url="login")


def home(request):
  featured_items = MenuItem.objects.filter(available=True, featured=True).select_related("category")[:6]
  if not featured_items:
    featured_items = MenuItem.objects.filter(available=True).select_related("category")[:6]

  context = {
    "featured_items": featured_items,
    "active_order_count": Order.objects.exclude(
      status__in=[Order.Status.COLLECTED, Order.Status.CANCELLED]
    ).count(),
  }
  return render(request, "cafe/home.html", context)


def menu(request):
  categories = MenuCategory.objects.prefetch_related("items")
  return render(request, "cafe/menu.html", {"categories": categories})


@require_POST
def add_to_cart(request, item_id):
  item = get_object_or_404(MenuItem, pk=item_id, available=True)
  try:
    quantity = max(1, min(20, int(request.POST.get("quantity", "1"))))
  except ValueError:
    quantity = 1
  cart = get_cart(request)
  cart[str(item.id)] = min(20, int(cart.get(str(item.id), 0)) + quantity)
  set_cart(request, cart)
  messages.success(request, f"Added {item.name} to your order.")
  return redirect(request.POST.get("next") or "cafe:menu")


def cart_detail(request):
  return render(request, "cafe/cart.html", {"summary": cart_summary(request)})


@require_POST
def update_cart(request, item_id):
  cart = get_cart(request)
  item_key = str(item_id)
  action = request.POST.get("action")

  if action == "remove":
    cart.pop(item_key, None)
  else:
    try:
      quantity = int(request.POST.get("quantity", "1"))
    except ValueError:
      quantity = 1
    if quantity <= 0:
      cart.pop(item_key, None)
    else:
      cart[item_key] = min(20, quantity)

  set_cart(request, cart)
  return redirect("cafe:cart")


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

  form = CheckoutForm(request.POST or None, initial=initial)
  if request.method == "POST" and form.is_valid():
    with transaction.atomic():
      order = Order.objects.create(
        customer=request.user if request.user.is_authenticated else None,
        guest_name=form.cleaned_data["name"],
        guest_email=form.cleaned_data["email"],
        guest_phone=form.cleaned_data["phone"],
        notes=form.cleaned_data["notes"],
      )
      for line in summary["lines"]:
        item = line["item"]
        OrderItem.objects.create(
          order=order,
          menu_item=item,
          item_name=item.name,
          quantity=line["quantity"],
          unit_price=item.price,
          prep_minutes_each=item.prep_minutes,
          line_total=line["line_total"],
        )
      order.recalculate_totals()

    set_cart(request, {})
    messages.success(request, "Order placed. Pay at the counter when you collect.")
    return redirect("cafe:order_detail", pk=order.pk, lookup_code=order.lookup_code)

  return render(request, "cafe/checkout.html", {"form": form, "summary": summary})


def order_detail(request, pk, lookup_code):
  order = get_object_or_404(
    Order.objects.prefetch_related("items"),
    pk=pk,
    lookup_code=lookup_code,
  )
  return render(request, "cafe/order_detail.html", {"order": order})


@login_required
def loyalty(request):
  profile, _ = CustomerProfile.objects.get_or_create(user=request.user)
  stamp_range = range(CustomerProfile.LOYALTY_STAMPS_REQUIRED)
  return render(
    request,
    "cafe/loyalty.html",
    {
      "profile": profile,
      "stamp_range": stamp_range,
      "stamps_required": CustomerProfile.LOYALTY_STAMPS_REQUIRED,
    },
  )


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
  ).prefetch_related("items")
  scan_form = LoyaltyScanForm()
  return render(
    request,
    "cafe/staff_dashboard.html",
    {"orders": active_orders, "status_choices": Order.Status.choices, "scan_form": scan_form},
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


def health(request):
  return JsonResponse({"status": "ok", "framework": "Django"})
