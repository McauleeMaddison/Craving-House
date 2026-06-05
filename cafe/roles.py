STAFF_GROUP = "Staff"
MANAGER_GROUP = "Manager"


def is_staff_member(user):
  return user.is_active and (
    user.is_staff
    or user.groups.filter(name__in=[STAFF_GROUP, MANAGER_GROUP]).exists()
  )


def is_manager(user):
  return user.is_active and (
    user.is_superuser
    or user.groups.filter(name=MANAGER_GROUP).exists()
  )


def role_label(user):
  if not user.is_authenticated:
    return ""
  if is_manager(user):
    return "Manager"
  if is_staff_member(user):
    return "Staff"
  return "Customer"
