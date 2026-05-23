"""Tests du chantier Contenu : accès membre (RG-22/10), séquentiel (RG-16),
quiz (RG-23 à RG-26), streaming signé (RG-17/19)."""
from django.test import override_settings
from rest_framework.test import APITestCase

from apps.accounts.models import User, UserStatus
from .models import Category, Collection, Content, ContentType

TEST_SETTINGS = dict(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
)


def make_content(**kw):
    """Contenu réservé aux membres (access=['MEMBRE']) par défaut."""
    defaults = dict(content_type=ContentType.VIDEO, title="C", category=Category.FORMATION,
                    active=True, order=0, quiz_active=False,
                    access_subscription_types=["MEMBRE"])
    defaults.update(kw)
    return Content.objects.create(**defaults)


@override_settings(**TEST_SETTINGS)
class MemberAccessTests(APITestCase):
    def setUp(self):
        self.actif = User.objects.create_user("actif@z.com", "Passw0rd!", full_name="A",
                                               email_verified=True, status=UserStatus.ACTIF)
        self.restreint = User.objects.create_user("restr@z.com", "Passw0rd!", full_name="R",
                                                   email_verified=True, status=UserStatus.RESTREINT)
        self.bloque = User.objects.create_user("bloq@z.com", "Passw0rd!", full_name="B",
                                                email_verified=True, status=UserStatus.BLOQUE)
        self.reserve = make_content(title="Réservé")
        self.libre = make_content(title="Libre", access_subscription_types=[])

    def _locked(self, user, content):
        self.client.force_authenticate(user)
        return self.client.get(f"/api/content/{content.id}/").data["access"]

    def test_reserved_accessible_to_active_member_only(self):
        self.assertFalse(self._locked(self.actif, self.reserve)["locked"])
        state = self._locked(self.restreint, self.reserve)
        self.assertTrue(state["locked"])
        self.assertEqual(state["lock_reason"], "subscription")

    def test_blocked_member_has_no_access(self):
        self.assertTrue(self._locked(self.bloque, self.reserve)["locked"])
        self.assertTrue(self._locked(self.bloque, self.libre)["locked"])  # BLOQUÉ : rien (RG-10)

    def test_free_content_open_to_any_non_blocked(self):
        self.assertFalse(self._locked(self.actif, self.libre)["locked"])
        self.assertFalse(self._locked(self.restreint, self.libre)["locked"])

    def test_locked_video_stream_forbidden_then_allowed(self):
        self.reserve.content_type = ContentType.VIDEO
        self.reserve.bucket_key = "videos/secret.mp4"
        self.reserve.save()
        self.client.force_authenticate(self.restreint)
        r = self.client.get(f"/api/content/{self.reserve.id}/stream/")
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.data["lock_reason"], "subscription")

        self.client.force_authenticate(self.actif)
        r = self.client.get(f"/api/content/{self.reserve.id}/stream/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("url", r.data)


@override_settings(**TEST_SETTINGS)
class SequentialAndQuizTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("u@z.com", "Passw0rd!", full_name="U",
                                              email_verified=True, status=UserStatus.ACTIF)
        self.col = Collection.objects.create(title="Parcours", content_type=ContentType.VIDEO,
                                             category=Category.FORMATION)
        self.m1 = make_content(collection=self.col, order=1, title="M1",
                               quiz_active=True, quiz_threshold=15)
        self.m2 = make_content(collection=self.col, order=2, title="M2", quiz_active=False)
        self.client.force_authenticate(self.user)

    def test_module2_locked_until_module1_validated(self):
        r = self.client.get(f"/api/content/{self.m2.id}/")
        self.assertTrue(r.data["access"]["locked"])
        self.assertEqual(r.data["access"]["lock_reason"], "quiz")

    def test_quiz_submit_validates_and_unlocks_next(self):
        r = self.client.post(f"/api/content/{self.m1.id}/quiz/submit/", {"score": 16}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["validated"])
        self.assertIsNotNone(r.data["validated_at"])
        r = self.client.get(f"/api/content/{self.m2.id}/")
        self.assertFalse(r.data["access"]["locked"])

    def test_quiz_keeps_best_score_no_downgrade(self):
        self.client.post(f"/api/content/{self.m1.id}/quiz/submit/", {"score": 16}, format="json")
        r = self.client.post(f"/api/content/{self.m1.id}/quiz/submit/", {"score": 8}, format="json")
        self.assertEqual(r.data["score"], 16)        # meilleur score conservé (RG-25)
        self.assertTrue(r.data["validated"])          # pas de rétrogradation (RG-26)
        self.assertEqual(r.data["attempts"], 2)       # tentatives illimitées (RG-24)

    def test_quiz_below_threshold_not_validated(self):
        r = self.client.post(f"/api/content/{self.m1.id}/quiz/submit/", {"score": 10}, format="json")
        self.assertFalse(r.data["validated"])

    def test_quiz_submit_on_module_without_quiz_400(self):
        r = self.client.post(f"/api/content/{self.m2.id}/quiz/submit/", {"score": 20}, format="json")
        self.assertEqual(r.status_code, 400)


@override_settings(**TEST_SETTINGS)
class StreamTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("s@z.com", "Passw0rd!", full_name="S",
                                              email_verified=True, status=UserStatus.ACTIF)
        self.pdf = make_content(content_type=ContentType.PDF, bucket_key="pdfs/livre.pdf", title="Livre")
        self.video = make_content(content_type=ContentType.VIDEO, bucket_key="videos/cours.mp4", title="Vidéo")
        self.no_media = make_content(content_type=ContentType.VIDEO, bucket_key="", title="Sans média")
        self.client.force_authenticate(self.user)

    def test_pdf_stream_returns_signed_url(self):
        r = self.client.get(f"/api/content/{self.pdf.id}/stream/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("url", r.data)
        self.assertEqual(r.data["expires_in"], 3600)

    def test_video_stream_returns_signed_url(self):
        r = self.client.get(f"/api/content/{self.video.id}/stream/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("url", r.data)

    def test_stream_without_media_400(self):
        r = self.client.get(f"/api/content/{self.no_media.id}/stream/")
        self.assertEqual(r.status_code, 400)

    def test_stream_locked_when_not_member(self):
        restreint = User.objects.create_user("r2@z.com", "Passw0rd!", full_name="R2",
                                              email_verified=True, status=UserStatus.RESTREINT)
        self.client.force_authenticate(restreint)
        r = self.client.get(f"/api/content/{self.pdf.id}/stream/")
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.data["lock_reason"], "subscription")


@override_settings(**TEST_SETTINGS)
class ExplicitAccessTests(APITestCase):
    """Modèle explicite : chaque contenu déclare les abonnements qui l'ouvrent."""

    def setUp(self):
        self.actif = User.objects.create_user("a@z.com", "Passw0rd!", full_name="A",
                                               email_verified=True, status=UserStatus.ACTIF)
        self.restreint = User.objects.create_user("r@z.com", "Passw0rd!", full_name="R",
                                                   email_verified=True, status=UserStatus.RESTREINT)
        self.bloque = User.objects.create_user("b@z.com", "Passw0rd!", full_name="B",
                                                email_verified=True, status=UserStatus.BLOQUE)

    def _locked(self, user, content):
        self.client.force_authenticate(user)
        return self.client.get(f"/api/content/{content.id}/").data["access"]["locked"]

    def test_membre_content_requires_active_member(self):
        c = make_content(access_subscription_types=["MEMBRE"])
        self.assertFalse(self._locked(self.actif, c))     # membre actif
        self.assertTrue(self._locked(self.restreint, c))  # adhésion non à jour
        self.assertTrue(self._locked(self.bloque, c))     # bloqué

    def test_empty_list_is_free_for_authenticated_but_not_blocked(self):
        c = make_content(access_subscription_types=[])
        self.assertFalse(self._locked(self.restreint, c))  # contenu libre
        self.assertFalse(self._locked(self.actif, c))
        self.assertTrue(self._locked(self.bloque, c))      # bloqué : aucun accès
