"""Tests du chantier Auth (CDC §3.3, §7.1)."""
from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import EmailOTP, User, UserStatus
from .services import generate_otp, verify_otp

TEST_SETTINGS = dict(
    CELERY_TASK_ALWAYS_EAGER=True,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
)


@override_settings(**TEST_SETTINGS)
class OTPServiceTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("a@b.com", "Passw0rd!", full_name="A")

    def test_generate_then_verify(self):
        code = generate_otp(self.user)
        ok, _ = verify_otp(self.user, code)
        self.assertTrue(ok)

    def test_wrong_code_counts_attempts(self):
        generate_otp(self.user)
        ok, _ = verify_otp(self.user, "000000")
        self.assertFalse(ok)
        self.assertEqual(EmailOTP.objects.filter(user=self.user, consumed=False).first().attempts, 1)

    def test_expired_code_rejected(self):
        generate_otp(self.user)
        otp = EmailOTP.objects.get(user=self.user, consumed=False)
        otp.expires_at = timezone.now() - timezone.timedelta(minutes=1)
        otp.save(update_fields=["expires_at"])
        ok, _ = verify_otp(self.user, "123456")
        self.assertFalse(ok)


@override_settings(**TEST_SETTINGS)
class AuthFlowTests(APITestCase):
    def setUp(self):
        cache.clear()  # isole throttling et compteur anti-brute-force entre tests

    def test_register_creates_user_and_otp(self):
        resp = self.client.post("/api/auth/register/", {
            "email": "new@zola.com", "full_name": "New",
            "password": "Passw0rd!", "password2": "Passw0rd!",
        }, format="json")
        self.assertEqual(resp.status_code, 201)
        user = User.objects.get(email="new@zola.com")
        self.assertEqual(user.status, UserStatus.RESTREINT)
        self.assertFalse(user.email_verified)
        self.assertEqual(EmailOTP.objects.filter(user=user).count(), 1)
        self.assertEqual(len(mail.outbox), 1)  # email OTP envoyé (eager)

    def test_verify_then_login_sets_refresh_cookie(self):
        # Inscription
        self.client.post("/api/auth/register/", {
            "email": "u@zola.com", "full_name": "U",
            "password": "Passw0rd!", "password2": "Passw0rd!",
        }, format="json")
        user = User.objects.get(email="u@zola.com")
        code = generate_otp(user)

        # Vérification OTP
        r = self.client.post("/api/auth/verify-otp/",
                             {"email": "u@zola.com", "code": code}, format="json")
        self.assertEqual(r.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.email_verified)

        # Connexion
        r = self.client.post("/api/auth/login/",
                             {"email": "u@zola.com", "password": "Passw0rd!"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertIn("access", r.data)
        self.assertIn("refresh_token", r.cookies)
        self.assertTrue(r.cookies["refresh_token"]["httponly"])

    def test_login_blocked_before_verification(self):
        User.objects.create_user("nv@zola.com", "Passw0rd!", full_name="NV", email_verified=False)
        r = self.client.post("/api/auth/login/",
                             {"email": "nv@zola.com", "password": "Passw0rd!"}, format="json")
        self.assertEqual(r.status_code, 403)

    def test_bruteforce_lockout(self):
        User.objects.create_user("v@zola.com", "Passw0rd!", full_name="V", email_verified=True)
        for _ in range(5):
            self.client.post("/api/auth/login/",
                             {"email": "v@zola.com", "password": "WRONG"}, format="json")
        # 6e tentative, même avec le bon mot de passe → verrouillé
        r = self.client.post("/api/auth/login/",
                             {"email": "v@zola.com", "password": "Passw0rd!"}, format="json")
        self.assertEqual(r.status_code, 429)

    def test_me_requires_auth_and_returns_profile(self):
        User.objects.create_user("m@zola.com", "Passw0rd!", full_name="Me", email_verified=True)
        self.assertEqual(self.client.get("/api/me/").status_code, 401)
        login = self.client.post("/api/auth/login/",
                                 {"email": "m@zola.com", "password": "Passw0rd!"}, format="json")
        token = login.data["access"]
        r = self.client.get("/api/me/", HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["email"], "m@zola.com")

    def test_refresh_via_cookie(self):
        User.objects.create_user("rf@zola.com", "Passw0rd!", full_name="Rf", email_verified=True)
        login = self.client.post("/api/auth/login/",
                                 {"email": "rf@zola.com", "password": "Passw0rd!"}, format="json")
        self.assertIn("refresh_token", login.cookies)
        # le cookie est renvoyé automatiquement par le client de test
        r = self.client.post("/api/auth/refresh/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("access", r.data)
