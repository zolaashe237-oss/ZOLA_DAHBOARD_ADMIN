"""Tests du chantier Admin : permission, journalisation, et règles
RG-06/13/15/20/21/27/33/39/40."""
from datetime import date

from django.test import override_settings
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User, UserStatus
from apps.audit.models import AuditAction, AuditLog
from apps.billing.models import Payment, PaymentStatus, PaymentType, Subscription, SubscriptionType
from apps.community.models import Audience, Comment, Like, Post
from apps.content.models import Category, Collection, Content, ContentType, QuizResult

TEST_SETTINGS = dict(
    CELERY_TASK_ALWAYS_EAGER=True,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
)


@override_settings(**TEST_SETTINGS)
class AdminBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user("admin@z.com", "Passw0rd!", full_name="Adm",
                                               email_verified=True, status=UserStatus.ACTIF, role=Role.ADMIN)
        self.member = User.objects.create_user("m@z.com", "Passw0rd!", full_name="Mbr",
                                                email_verified=True, status=UserStatus.RESTREINT, role=Role.MEMBER)
        self.client.force_authenticate(self.admin)


class PermissionTests(AdminBase):
    def test_member_forbidden_on_admin_routes(self):
        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.get("/api/admin/dashboard/").status_code, 403)
        self.assertEqual(self.client.get("/api/admin/members/").status_code, 403)

    def test_admin_allowed(self):
        self.assertEqual(self.client.get("/api/admin/dashboard/").status_code, 200)


class MemberManagementTests(AdminBase):
    def test_block_sets_status_and_audits(self):
        r = self.client.post(f"/api/admin/members/{self.member.id}/block/", {"reason": "abus"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.member.refresh_from_db()
        self.assertEqual(self.member.status, UserStatus.BLOQUE)
        self.assertTrue(AuditLog.objects.filter(action=AuditAction.BLOCK_USER,
                                                target_id=str(self.member.id)).exists())

    def test_warn_increments_and_flags_recidive(self):
        for _ in range(3):
            r = self.client.post(f"/api/admin/members/{self.member.id}/warn/",
                                 {"reason": "x"}, format="json")
        self.assertTrue(r.data["recidive_alert"])
        self.assertEqual(AuditLog.objects.filter(action=AuditAction.WARN_USER).count(), 3)

class FinanceTests(AdminBase):
    def test_manual_inscription_activates_membership_and_audits(self):
        r = self.client.post("/api/admin/payments/manual/",
                             {"user_id": self.member.id, "kind": "INSCRIPTION", "reason": "espèces"},
                             format="json")
        self.assertEqual(r.status_code, 201)
        self.member.refresh_from_db()
        self.assertEqual(self.member.status, UserStatus.ACTIF)        # RG-06
        self.assertTrue(Subscription.objects.filter(user=self.member,
                        type=SubscriptionType.MEMBRE, active=True).exists())
        p = Payment.objects.get(id=r.data["payment_id"])
        self.assertIsNone(p.swinmo_ref)                               # swinmo_ref NULL
        self.assertTrue(AuditLog.objects.filter(action=AuditAction.MANUAL_PAYMENT).exists())

    def test_refund_is_negative(self):
        r = self.client.post("/api/admin/payments/refund/",
                             {"user_id": self.member.id, "amount": 5000, "reason": "erreur"},
                             format="json")
        p = Payment.objects.get(id=r.data["payment_id"])
        self.assertEqual(p.type, PaymentType.REMBOURSEMENT)
        self.assertEqual(p.amount, -5000)                             # RG-39

    def test_exoneration_amount_zero(self):
        r = self.client.post("/api/admin/payments/exonerate/",
                             {"user_id": self.member.id, "reason": "cas social"}, format="json")
        p = Payment.objects.get(id=r.data["payment_id"])
        self.assertEqual(p.amount, 0)                                 # RG-40
        self.assertEqual(p.type, PaymentType.COTISATION)

    def test_dashboard_kpis(self):
        r = self.client.get("/api/admin/dashboard/")
        self.assertIn("revenue_month", r.data)
        self.assertIn("reports_pending", r.data)

    def test_export_members_csv(self):
        r = self.client.get("/api/admin/exports/members.csv")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r["Content-Type"], "text/csv")
        self.assertTrue(AuditLog.objects.filter(action=AuditAction.EXPORT_DATA).exists())


class ContentAdminTests(AdminBase):
    def test_collection_homogeneity_enforced(self):
        col = Collection.objects.create(title="C", content_type=ContentType.VIDEO, category=Category.FORMATION)
        r = self.client.post("/api/admin/content/", {
            "content_type": "PDF", "title": "doc", "category": "FORMATION", "collection": col.id,
        }, format="json")
        self.assertEqual(r.status_code, 400)                          # RG-15

    def test_content_logical_delete(self):
        c = Content.objects.create(content_type=ContentType.VIDEO, title="v", category=Category.FORMATION, active=True)
        r = self.client.delete(f"/api/admin/content/{c.id}/")
        self.assertEqual(r.status_code, 204)
        c.refresh_from_db()
        self.assertFalse(c.active)                                    # RG-20
        self.assertTrue(AuditLog.objects.filter(action=AuditAction.DELETE_CONTENT).exists())

    def test_collection_delete_detaches_contents(self):
        col = Collection.objects.create(title="C", content_type=ContentType.VIDEO, category=Category.FORMATION)
        c = Content.objects.create(content_type=ContentType.VIDEO, title="v", category=Category.FORMATION, collection=col)
        self.client.delete(f"/api/admin/collections/{col.id}/")
        c.refresh_from_db()
        self.assertIsNone(c.collection_id)                            # RG-21
        col.refresh_from_db()
        self.assertFalse(col.active)

    def test_reset_quiz_requires_reason_and_audits(self):
        c = Content.objects.create(content_type=ContentType.VIDEO, title="v", category=Category.FORMATION,
                                   quiz_active=True)
        QuizResult.objects.create(user=self.member, content=c, score=18, validated=True, attempts=2)
        r = self.client.post("/api/admin/quiz/reset/",
                             {"user_id": self.member.id, "content_id": c.id, "reason": "triche"}, format="json")
        self.assertEqual(r.status_code, 200)
        qr = QuizResult.objects.get(user=self.member, content=c)
        self.assertFalse(qr.validated)
        self.assertEqual(qr.score, 0)                                 # RG-27
        self.assertTrue(AuditLog.objects.filter(action=AuditAction.RESET_QUIZ).exists())


class ModerationTests(AdminBase):
    def test_delete_post_cascade(self):
        author = User.objects.create_user("au@z.com", "Passw0rd!", full_name="Au",
                                          email_verified=True, status=UserStatus.ACTIF)
        post = Post.objects.create(author=author, text="x", audience=Audience.TOUS, likes_count=2)
        Comment.objects.create(post=post, author=author, text="c")
        Like.objects.create(post=post, user=self.member)
        r = self.client.post(f"/api/admin/posts/{post.id}/delete/", {"reason": "spam"}, format="json")
        self.assertEqual(r.status_code, 200)
        post.refresh_from_db()
        self.assertFalse(post.active)                                 # RG-33
        self.assertEqual(post.likes_count, 0)
        self.assertFalse(Comment.objects.filter(post=post, active=True).exists())
        self.assertFalse(Like.objects.filter(post=post).exists())
        self.assertTrue(AuditLog.objects.filter(action=AuditAction.DELETE_POST).exists())

    def test_audit_log_is_append_only_via_orm(self):
        log = AuditLog.objects.create(actor=self.admin, action=AuditAction.WARN_USER)
        with self.assertRaises(PermissionError):
            log.reason = "x"
            log.save()
        with self.assertRaises(PermissionError):
            log.delete()
