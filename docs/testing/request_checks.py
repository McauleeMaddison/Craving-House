"""Supplementary assessment checks; run explicitly, separate from cafe/tests.py.

python3 manage.py test docs.testing.request_checks --verbosity 2
These exercise Django forms/responses, not a graphical browser.
"""
from pathlib import Path
from unittest.mock import patch

from django.contrib.auth.models import Group, User
from django.template.loader import get_template
from django.test import TestCase
from cafe.forms import CheckoutForm, FeedbackForm, LoyaltyScanForm, MenuItemForm, SignUpForm
from cafe.models import CustomerProfile, Feedback, LoyaltyScan, MenuCategory, MenuItem, Order


class AssessmentChecks(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.category = MenuCategory.objects.create(name='Assessment coffee')
        cls.item = MenuItem.objects.create(category=cls.category, name='Assessment latte', description='Coffee', price='3.80')
        cls.customer = User.objects.create_user('assessment_customer', email='customer@example.com', password='CustomerPass123')
        cls.profile = CustomerProfile.objects.create(user=cls.customer)
        cls.staff = User.objects.create_user('assessment_staff', password='StaffPass123')
        cls.staff.groups.add(Group.objects.create(name='Staff'))
        cls.manager = User.objects.create_user('assessment_manager', password='ManagerPass123')
        cls.manager.groups.add(Group.objects.create(name='Manager'))

    def test_signup_valid_missing_invalid_and_duplicate(self):
        valid = dict(username='new_assessment_customer', email='new@example.com', password1='AssessmentCocoa2026!', password2='AssessmentCocoa2026!')
        self.assertTrue(SignUpForm(valid).is_valid())
        self.assertFalse(SignUpForm({}).is_valid())
        for change in [dict(email='bad'), dict(password2='different'), dict(username='assessment_customer'), dict(password1='123', password2='123')]:
            self.assertFalse(SignUpForm({**valid, **change}).is_valid())
        response = self.client.post('/signup/', {**valid, 'password2': 'different'})
        self.assertContains(response, 'password fields')
        self.assertFalse(User.objects.filter(username=valid['username']).exists())

    def test_checkout_validation_does_not_create_order(self):
        self.assertTrue(CheckoutForm({'name':'Guest'}).is_valid())
        self.assertFalse(CheckoutForm({}).is_valid())
        self.assertFalse(CheckoutForm({'name':'Guest', 'email':'bad'}).is_valid())
        self.client.post(f'/cart/add/{self.item.pk}/', {'quantity':1})
        for data in [{'email':'guest@example.com'}, {'name':'Guest','email':'bad'}]:
            response = self.client.post('/checkout/', data)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.context['form'].errors)
        self.assertEqual(Order.objects.count(), 0)

    def test_feedback_valid_missing_and_out_of_range(self):
        valid = dict(name='Guest', email='guest@example.com', rating=5, message='Assessment feedback')
        self.assertTrue(FeedbackForm(valid).is_valid())
        self.assertFalse(FeedbackForm({}).is_valid())
        for change in [dict(email='bad'), dict(rating=0), dict(rating=6), dict(message='')]:
            response = self.client.post('/feedback/', {**valid, **change})
            self.assertTrue(response.context['form'].errors)
        self.assertEqual(Feedback.objects.count(), 0)

    def test_manager_form_missing_and_invalid_inputs(self):
        self.client.force_login(self.manager)
        valid = dict(category=self.category.pk, name='New cocoa', description='Cocoa', price='2.95', prep_minutes=5, available=True)
        self.assertTrue(MenuItemForm(valid).is_valid())
        self.assertFalse(MenuItemForm({}).is_valid())
        for change in [dict(price='bad'), dict(prep_minutes=-1), dict(name=''), dict(name=self.item.name)]:
            response = self.client.post('/manager/menu/new/', {**valid, **change})
            self.assertTrue(response.context['form'].errors)
        self.assertEqual(MenuItem.objects.count(), 1)

    def test_loyalty_invalid_inputs_and_reward_boundary(self):
        self.client.force_login(self.staff)
        self.assertFalse(LoyaltyScanForm({}).is_valid())
        for data in [dict(card_code='bad',stamps=1), dict(card_code=str(self.profile.card_code),stamps=0), dict(card_code=str(self.profile.card_code),stamps=9)]:
            response = self.client.post('/staff/loyalty/scan/', data, follow=True)
            self.assertContains(response, 'Enter a valid loyalty card code and stamp count.')
        self.assertEqual(LoyaltyScan.objects.count(), 0)
        self.client.post('/staff/loyalty/scan/', dict(card_code=str(self.profile.card_code),stamps=8))
        self.profile.refresh_from_db()
        self.assertEqual((self.profile.stamps, self.profile.rewards_available), (0, 1))
        self.assertEqual(LoyaltyScan.objects.count(), 1)

    def test_staff_status_validation_and_collected_queue(self):
        self.client.force_login(self.staff)
        order = Order.objects.create(guest_name='Assessment guest')
        response = self.client.post(f'/staff/orders/{order.pk}/status/', {'status':'invalid'}, follow=True)
        self.assertContains(response, 'That order status is not valid.')
        order.refresh_from_db()
        self.assertEqual(order.status, 'placed')
        self.client.post(f'/staff/orders/{order.pk}/status/', {'status':'collected'})
        self.assertNotContains(self.client.get('/staff/'), 'Assessment guest')

    def test_unconfigured_stripe_rejects_direct_post(self):
        self.client.post(f'/cart/add/{self.item.pk}/', {'quantity':1})
        with patch.dict('os.environ', {'STRIPE_SECRET_KEY': ''}):
            response = self.client.post('/checkout/', {'name':'Guest','payment_method':'stripe'})
        self.assertContains(response, 'Stripe test payments are not configured')
        self.assertEqual(Order.objects.count(), 0)

    def test_cart_zero_removal_and_order_lookup(self):
        self.client.post(f'/cart/add/{self.item.pk}/', {'quantity':1})
        self.client.post(f'/cart/update/{self.item.pk}/', {'quantity':0})
        self.assertContains(self.client.get('/cart/'), 'Your cart is empty')
        order = Order.objects.create(guest_name='Assessment guest')
        self.assertEqual(self.client.get(f'/orders/{order.pk}/00000000-0000-4000-8000-000000000000/').status_code, 404)

    def test_all_project_templates_compile(self):
        root = Path(__file__).resolve().parents[2] / 'templates'
        templates = list(root.rglob('*.html'))
        self.assertEqual(len(templates), 15)
        for path in templates:
            get_template(str(path.relative_to(root)))
