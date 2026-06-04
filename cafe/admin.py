from django.contrib import admin

from .models import CustomerProfile, Feedback, LoyaltyScan, MenuCategory, MenuItem, MenuItemAddOn, Order, OrderItem


class OrderItemInline(admin.TabularInline):
  model = OrderItem
  extra = 0
  readonly_fields = ["line_total"]


class MenuItemAddOnInline(admin.TabularInline):
  model = MenuItemAddOn
  extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
  list_display = ["id", "guest_name", "status", "subtotal", "prep_minutes", "created_at"]
  list_filter = ["status", "created_at"]
  search_fields = ["guest_name", "guest_email", "guest_phone"]
  inlines = [OrderItemInline]


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
  list_display = ["name", "category", "price", "prep_minutes", "available", "featured"]
  list_filter = ["category", "available", "featured", "loyalty_eligible"]
  search_fields = ["name", "description"]
  inlines = [MenuItemAddOnInline]


admin.site.register(MenuCategory)
admin.site.register(CustomerProfile)
admin.site.register(Feedback)
admin.site.register(LoyaltyScan)
