from decimal import Decimal

from django.contrib.auth.models import Group, User
from django.core.management.base import BaseCommand

from cafe.models import CustomerProfile, MenuCategory, MenuItem


MENU = {
  "Coffee": [
    ("House Latte", "Double espresso with steamed milk and a caramel finish.", "3.80", 4, True),
    ("Velvet Cappuccino", "Classic cappuccino with rich foam and cocoa dust.", "3.60", 4, True),
    ("Iced Spanish Latte", "Cold milk, espresso, and condensed milk over ice.", "4.20", 5, True),
  ],
  "Bites": [
    ("Pistachio Croissant", "Buttery pastry filled with pistachio cream.", "3.95", 6, True),
    ("Halloumi Toastie", "Grilled sourdough with halloumi, tomato, and basil.", "6.50", 8, False),
    ("Banana Bread", "House-baked banana bread served warm.", "3.40", 4, True),
  ],
  "Refreshers": [
    ("Mango Iced Tea", "Black tea shaken with mango and citrus.", "3.70", 3, True),
    ("Berry Lemonade", "Sparkling lemonade with mixed berry syrup.", "3.90", 3, True),
  ],
}


class Command(BaseCommand):
  help = "Create demo categories, menu items, and staff accounts."

  def handle(self, *args, **options):
    staff_group, _ = Group.objects.get_or_create(name="Staff")
    manager_group, _ = Group.objects.get_or_create(name="Manager")

    for index, (category_name, items) in enumerate(MENU.items()):
      category, _ = MenuCategory.objects.get_or_create(
        name=category_name,
        defaults={"display_order": index},
      )
      category.display_order = index
      category.save()

      for item_index, (name, description, price, prep, loyalty) in enumerate(items):
        MenuItem.objects.update_or_create(
          category=category,
          name=name,
          defaults={
            "description": description,
            "price": Decimal(price),
            "prep_minutes": prep,
            "loyalty_eligible": loyalty,
            "available": True,
            "featured": item_index == 0,
          },
        )

    manager, created = User.objects.get_or_create(
      username="manager",
      defaults={"email": "manager@example.com", "is_staff": True, "is_superuser": True},
    )
    if created:
      manager.set_password("ManagerPass123")
      manager.save()
    manager.groups.add(manager_group)

    staff, created = User.objects.get_or_create(
      username="staff",
      defaults={"email": "staff@example.com", "is_staff": True},
    )
    if created:
      staff.set_password("StaffPass123")
      staff.save()
    staff.groups.add(staff_group)

    customer, created = User.objects.get_or_create(
      username="customer",
      defaults={"email": "customer@example.com"},
    )
    if created:
      customer.set_password("CustomerPass123")
      customer.save()
    CustomerProfile.objects.get_or_create(user=customer)

    self.stdout.write(self.style.SUCCESS("Demo data ready."))
