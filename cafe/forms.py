from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User

from .models import Feedback, MenuItem


class AddToCartForm(forms.Form):
  quantity = forms.IntegerField(min_value=1, max_value=20, initial=1)


class CheckoutForm(forms.Form):
  name = forms.CharField(max_length=120)
  email = forms.EmailField(required=False)
  phone = forms.CharField(max_length=32, required=False)
  notes = forms.CharField(
    required=False,
    widget=forms.Textarea(attrs={"rows": 3}),
    help_text="Allergies, milk choice notes, or pickup instructions.",
  )


class FeedbackForm(forms.ModelForm):
  def __init__(self, *args, user=None, **kwargs):
    super().__init__(*args, **kwargs)
    if user and user.is_authenticated:
      self.fields.pop("email", None)

  class Meta:
    model = Feedback
    fields = ["name", "email", "rating", "message"]
    widgets = {
      "rating": forms.NumberInput(attrs={"min": 1, "max": 5}),
      "message": forms.Textarea(attrs={"rows": 4}),
    }


class MenuItemForm(forms.ModelForm):
  class Meta:
    model = MenuItem
    fields = [
      "category",
      "name",
      "description",
      "price",
      "prep_minutes",
      "loyalty_eligible",
      "available",
      "featured",
    ]
    widgets = {
      "description": forms.Textarea(attrs={"rows": 4}),
    }


class SignUpForm(UserCreationForm):
  email = forms.EmailField(required=True)

  class Meta:
    model = User
    fields = ["username", "email", "password1", "password2"]


class LoyaltyScanForm(forms.Form):
  card_code = forms.UUIDField(label="Customer card code")
  stamps = forms.IntegerField(min_value=1, max_value=8, initial=1)
