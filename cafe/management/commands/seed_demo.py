from decimal import Decimal

from django.contrib.auth.models import Group, User
from django.core.management.base import BaseCommand

from cafe.models import CustomerProfile, MenuCategory, MenuItem


MENU = {
  "Hot drinks": [
    ("Espresso", "Short, bold espresso pulled to order.", "2.50", 2, True),
    ("Cappuccino", "Espresso with steamed milk, foam, and cocoa dust.", "3.50", 3, True),
    ("Americano", "Espresso topped with hot water.", "3.10", 2, True),
    ("Flat White", "Strong, silky, and balanced.", "3.25", 3, True),
    ("Mocha", "Espresso, chocolate, and steamed milk.", "3.80", 3, True),
    ("Cortado", "Espresso cut with a small pour of warm milk.", "3.20", 3, True),
    ("Latte", "Smooth espresso with steamed milk.", "3.20", 3, True),
    ("House Latte", "Double espresso with steamed milk and a caramel finish.", "3.80", 4, True),
    ("Velvet Cappuccino", "Classic cappuccino with rich foam and cocoa dust.", "3.60", 4, True),
    ("Chai Latte", "Spiced chai with steamed milk.", "3.50", 3, False),
    ("Turmeric Latte", "Golden turmeric latte with warming spice.", "3.30", 3, False),
    ("Hot Chocolate", "Rich chocolate with steamed milk.", "3.50", 3, False),
    ("Breakfast Tea", "Classic breakfast tea.", "2.10", 2, False),
    ("Herbal Tea", "Caffeine-free herbal infusion.", "2.10", 2, False),
    ("Peppermint Tea", "Fresh peppermint infusion.", "2.10", 2, False),
    ("Green Tea", "Light green tea.", "2.10", 2, False),
  ],
  "Cold drinks": [
    ("Iced Caramel", "Iced coffee with caramel syrup.", "3.90", 3, True),
    ("Iced Hazelnut", "Iced coffee with hazelnut syrup.", "3.60", 3, True),
    ("Iced Latte", "Cold milk and espresso served over ice.", "3.20", 3, True),
    ("Iced Spanish Latte", "Cold milk, espresso, and condensed milk over ice.", "4.20", 5, True),
    ("Iced Mocha", "Iced coffee with chocolate.", "3.50", 3, True),
    ("Iced Chocolate", "Chilled chocolate drink.", "3.50", 3, False),
    ("Protein Coffee", "Iced coffee with protein boost.", "3.50", 3, True),
    ("Affogato", "Espresso poured over soft ice cream.", "4.10", 3, True),
    ("Smoothies", "Cold blended fruit smoothie.", "4.80", 3, False),
    ("Mango Iced Tea", "Black tea shaken with mango and citrus.", "3.70", 3, True),
    ("Berry Lemonade", "Sparkling lemonade with mixed berry syrup.", "3.90", 3, True),
  ],
  "Breakfast & light bites": [
    ("Grilled Ham & Cheese", "Toasted ham and cheese breakfast sandwich.", "6.00", 5, False),
    ("Panini Ham & Cheese", "Pressed panini with ham and melted cheese.", "6.50", 5, False),
    ("The Toasted Temptation", "Panini with chicken, mozzarella, and pesto.", "6.90", 6, False),
    ("Protein Tuna Turner", "Panini tuna melt.", "6.90", 6, False),
    ("Tornado", "Protein chicken and cheese melt.", "6.90", 6, False),
    ("Croissant Ham & Cheese", "Warm croissant filled with ham and cheese.", "3.30", 3, False),
    ("Croissant", "Classic butter croissant.", "1.80", 1, False),
    ("Croissant Chocolate", "Chocolate-filled croissant.", "1.80", 1, False),
    ("Pistachio Croissant", "Buttery pastry filled with pistachio cream.", "3.95", 6, True),
    ("Halloumi Toastie", "Grilled sourdough with halloumi, tomato, and basil.", "6.50", 8, False),
    ("Banana Bread", "House-baked banana bread served warm.", "3.40", 4, True),
    ("The Italian Grill", "Focaccia with salami, ham, prosciutto, mozzarella, and mustard.", "6.50", 6, False),
    ("The Spaniard", "Panini with serrano ham and tomato.", "5.50", 6, False),
  ],
  "Hot dogs": [
    ("Bratwurst XXL", "Large bratwurst hot dog.", "7.50", 6, False),
    ("Cheese Bratwurst XXL", "Large bratwurst hot dog with cheese.", "8.00", 6, False),
    ("Choripan", "Chorizo-style hot dog.", "6.00", 6, False),
    ("Mozzarella", "Hot dog add-on.", "1.00", 1, False),
    ("Shoestring Potatoes", "Crispy hot dog topping.", "1.00", 1, False),
  ],
  "Meals": [
    ("Chicken Cotoletta with Chips", "Chicken cotoletta served with chips.", "8.00", 7, False),
    ("Meat Cotoletta with Chips", "Meat cotoletta served with chips.", "9.00", 7, False),
    ("6 Chicken Wings", "Six chicken wings.", "5.95", 6, False),
    ("Homemade Rice", "House rice side.", "3.95", 3, False),
    ("6 Parmesan Wings", "Six parmesan wings.", "6.10", 6, False),
    ("6 Buffalo Wings", "Six buffalo wings.", "6.10", 6, False),
    ("Add Chips", "Add chips to your meal.", "3.50", 2, False),
  ],
  "Waffles & toppings": [
    ("Waffle Plain", "Fresh plain waffle.", "5.30", 5, False),
    ("Waffle Protein", "Protein waffle.", "6.80", 5, False),
    ("Biscuit Crumbs", "Waffle topping.", "1.10", 1, False),
    ("Nutella", "Waffle topping.", "1.10", 1, False),
    ("Dulce de Leche", "Waffle topping.", "1.30", 1, False),
    ("Sprinkles", "Waffle topping.", "1.10", 1, False),
    ("Chocolate Chips", "Waffle topping.", "1.20", 1, False),
    ("Mini Marshmallows", "Waffle topping.", "1.20", 1, False),
    ("Soft Ice Cream", "Waffle topping.", "1.50", 1, False),
  ],
}

LEGACY_DEMO_ITEMS = {
  "Coffee": ["House Latte", "Velvet Cappuccino", "Iced Spanish Latte"],
  "Bites": ["Pistachio Croissant", "Halloumi Toastie", "Banana Bread"],
  "Refreshers": ["Mango Iced Tea", "Berry Lemonade"],
}


class Command(BaseCommand):
  help = "Create demo categories, menu items, and staff accounts."

  def handle(self, *args, **options):
    staff_group, _ = Group.objects.get_or_create(name="Staff")
    manager_group, _ = Group.objects.get_or_create(name="Manager")

    for category_name, item_names in LEGACY_DEMO_ITEMS.items():
      try:
        category = MenuCategory.objects.get(name=category_name)
      except MenuCategory.DoesNotExist:
        continue
      MenuItem.objects.filter(category=category, name__in=item_names).delete()
      if not category.items.exists():
        category.delete()

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
