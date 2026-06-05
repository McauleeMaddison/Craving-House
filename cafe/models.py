from decimal import Decimal
import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.urls import reverse
from django.utils.text import slugify


class MenuCategory(models.Model):
  name = models.CharField(max_length=80, unique=True)
  slug = models.SlugField(max_length=90, unique=True, blank=True)
  display_order = models.PositiveIntegerField(default=0)

  class Meta:
    ordering = ["display_order", "name"]
    verbose_name_plural = "menu categories"

  def save(self, *args, **kwargs):
    if not self.slug:
      self.slug = slugify(self.name)
    super().save(*args, **kwargs)

  def __str__(self):
    return self.name


class MenuItem(models.Model):
  category = models.ForeignKey(
    MenuCategory,
    related_name="items",
    on_delete=models.PROTECT,
  )
  name = models.CharField(max_length=120)
  description = models.TextField()
  price = models.DecimalField(max_digits=6, decimal_places=2)
  prep_minutes = models.PositiveIntegerField(default=5)
  loyalty_eligible = models.BooleanField(default=True)
  available = models.BooleanField(default=True)
  featured = models.BooleanField(default=False)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    ordering = ["category__display_order", "name"]
    constraints = [
      models.UniqueConstraint(fields=["category", "name"], name="unique_menu_item_name")
    ]

  def __str__(self):
    return self.name

  def get_absolute_url(self):
    return reverse("cafe:menu")


class MenuItemAddOn(models.Model):
  menu_item = models.ForeignKey(
    MenuItem,
    related_name="add_ons",
    on_delete=models.CASCADE,
  )
  name = models.CharField(max_length=80)
  price = models.DecimalField(max_digits=6, decimal_places=2)
  available = models.BooleanField(default=True)
  display_order = models.PositiveIntegerField(default=0)

  class Meta:
    ordering = ["display_order", "name"]
    constraints = [
      models.UniqueConstraint(fields=["menu_item", "name"], name="unique_menu_item_add_on")
    ]

  def __str__(self):
    return f"{self.name} for {self.menu_item.name}"


class CustomerProfile(models.Model):
  LOYALTY_STAMPS_REQUIRED = 8

  user = models.OneToOneField(
    settings.AUTH_USER_MODEL,
    related_name="customer_profile",
    on_delete=models.CASCADE,
  )
  phone = models.CharField(max_length=32, blank=True)
  card_code = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
  stamps = models.PositiveIntegerField(default=0)
  rewards_available = models.PositiveIntegerField(default=0)
  updated_at = models.DateTimeField(auto_now=True)

  def add_stamps(self, amount):
    self.stamps += amount
    while self.stamps >= self.LOYALTY_STAMPS_REQUIRED:
      self.stamps -= self.LOYALTY_STAMPS_REQUIRED
      self.rewards_available += 1
    self.save(update_fields=["stamps", "rewards_available", "updated_at"])

  def __str__(self):
    return f"{self.user.username} loyalty card"


class Order(models.Model):
  class Status(models.TextChoices):
    PLACED = "placed", "Placed"
    PREPARING = "preparing", "Preparing"
    READY = "ready", "Ready for collection"
    COLLECTED = "collected", "Collected"
    CANCELLED = "cancelled", "Cancelled"

  class PaymentMethod(models.TextChoices):
    COUNTER = "counter", "Pay at counter"
    STRIPE = "stripe", "Stripe card"

  class PaymentStatus(models.TextChoices):
    DUE = "due", "Due at collection"
    PENDING = "pending", "Card payment pending"
    PAID = "paid", "Paid"

  customer = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    blank=True,
    null=True,
    related_name="orders",
    on_delete=models.SET_NULL,
  )
  guest_name = models.CharField(max_length=120)
  guest_email = models.EmailField(blank=True)
  guest_phone = models.CharField(max_length=32, blank=True)
  lookup_code = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
  status = models.CharField(
    max_length=20,
    choices=Status.choices,
    default=Status.PLACED,
  )
  payment_method = models.CharField(
    max_length=20,
    choices=PaymentMethod.choices,
    default=PaymentMethod.COUNTER,
  )
  payment_status = models.CharField(
    max_length=20,
    choices=PaymentStatus.choices,
    default=PaymentStatus.DUE,
  )
  stripe_checkout_session_id = models.CharField(max_length=255, blank=True)
  notes = models.TextField(blank=True)
  subtotal = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
  prep_minutes = models.PositiveIntegerField(default=0)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    ordering = ["-created_at"]

  def __str__(self):
    return f"Order #{self.pk or 'new'} for {self.guest_name}"

  def recalculate_totals(self):
    subtotal = sum((item.line_total for item in self.items.all()), Decimal("0.00"))
    prep_minutes = sum(item.prep_minutes_total for item in self.items.all())
    self.subtotal = subtotal
    self.prep_minutes = prep_minutes
    self.save(update_fields=["subtotal", "prep_minutes", "updated_at"])


class OrderItem(models.Model):
  order = models.ForeignKey(Order, related_name="items", on_delete=models.CASCADE)
  menu_item = models.ForeignKey(MenuItem, blank=True, null=True, on_delete=models.SET_NULL)
  item_name = models.CharField(max_length=120)
  add_on_names = models.CharField(max_length=240, blank=True)
  add_on_total = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0.00"))
  quantity = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(20)])
  unit_price = models.DecimalField(max_digits=6, decimal_places=2)
  prep_minutes_each = models.PositiveIntegerField(default=5)
  line_total = models.DecimalField(max_digits=8, decimal_places=2)

  class Meta:
    ordering = ["item_name"]

  @property
  def prep_minutes_total(self):
    return self.quantity * self.prep_minutes_each

  @property
  def add_on_list(self):
    if not self.add_on_names:
      return []
    return [name.strip() for name in self.add_on_names.split(",") if name.strip()]

  def save(self, *args, **kwargs):
    self.line_total = self.unit_price * self.quantity
    super().save(*args, **kwargs)

  def __str__(self):
    return f"{self.quantity} x {self.item_name}"


class Feedback(models.Model):
  name = models.CharField(max_length=120)
  email = models.EmailField(blank=True)
  rating = models.PositiveSmallIntegerField(
    validators=[MinValueValidator(1), MaxValueValidator(5)]
  )
  message = models.TextField()
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    ordering = ["-created_at"]

  def __str__(self):
    return f"{self.rating}/5 from {self.name}"


class LoyaltyScan(models.Model):
  profile = models.ForeignKey(
    CustomerProfile,
    related_name="scans",
    on_delete=models.CASCADE,
  )
  staff_user = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    related_name="loyalty_scans",
    on_delete=models.PROTECT,
  )
  stamps_added = models.PositiveIntegerField(default=1)
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    ordering = ["-created_at"]

  def __str__(self):
    return f"{self.stamps_added} stamp(s) for {self.profile.user.username}"
