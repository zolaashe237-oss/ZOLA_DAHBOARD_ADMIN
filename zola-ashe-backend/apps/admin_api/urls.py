"""Routes du back-office admin (montées sous /api/admin/)."""
from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.blog.views import AdminArticleViewSet

from . import views_content as vc
from . import views_finance as vf
from . import views_members as vm
from . import views_moderation as vmod
from . import views_progression as vp

router = DefaultRouter()
router.register("members", vm.MemberViewSet, basename="admin-member")
router.register("formations", vc.AdminFormationViewSet, basename="admin-formation")
router.register("modules", vc.AdminModuleViewSet, basename="admin-module")
router.register("courses", vc.AdminCourseViewSet, basename="admin-course")
router.register("resources", vc.AdminResourceViewSet, basename="admin-resource")
router.register("quizzes", vc.AdminQuizViewSet, basename="admin-quiz")
router.register("blog", AdminArticleViewSet, basename="admin-blog")

urlpatterns = [
    # Dashboard & finance
    path("dashboard/", vf.DashboardView.as_view(), name="admin-dashboard"),
    path("finance/monthly/", vf.MonthlyRevenueView.as_view(), name="admin-finance-monthly"),
    path("finance/late/", vf.LateCotisationsView.as_view(), name="admin-finance-late"),
    path("finance/breakdown/", vf.PaymentBreakdownView.as_view(), name="admin-finance-breakdown"),
    path("transactions/kpis/", vf.TransactionKpisView.as_view(), name="admin-transactions-kpis"),
    path("transactions/", vf.TransactionListView.as_view(), name="admin-transactions-list"),
    path("payments/manual/", vf.ManualPaymentView.as_view(), name="admin-payment-manual"),
    path("payments/refund/", vf.RefundView.as_view(), name="admin-payment-refund"),
    path("payments/exonerate/", vf.ExonerationView.as_view(), name="admin-payment-exonerate"),
    path("exports/members.csv", vf.ExportMembersView.as_view(), name="admin-export-members"),
    path("exports/payments.csv", vf.ExportPaymentsView.as_view(), name="admin-export-payments"),
    path("reminders/send/", vf.SendRemindersView.as_view(), name="admin-reminders"),

    # Contenu & quiz
    path("content/upload/", vc.ContentUploadView.as_view(), name="admin-content-upload"),
    path("quiz/results/", vc.AdminQuizResultListView.as_view(), name="admin-quiz-results"),
    path("quiz/score/", vc.QuizScoreView.as_view(), name="admin-quiz-score"),
    path("quiz/reset/", vc.ResetQuizView.as_view(), name="admin-quiz-reset"),

    # Communauté : annonces & modération
    path("posts/", vc.AdminPostCreateView.as_view(), name="admin-post-create"),
    path("posts/<int:pk>/delete/", vmod.AdminDeletePostView.as_view(), name="admin-post-delete"),
    path("comments/<int:pk>/delete/", vmod.AdminDeleteCommentView.as_view(), name="admin-comment-delete"),
    path("reports/", vmod.ReportQueueView.as_view(), name="admin-reports"),
    path("reports/<int:pk>/handle/", vmod.HandleReportView.as_view(), name="admin-report-handle"),

    # Audit
    path("audit/", vmod.AuditLogListView.as_view(), name="admin-audit"),

    # Progression des membres
    path("progression/kpis/", vp.ProgressionKpisView.as_view(), name="admin-progression-kpis"),
    path("progression/stats/", vp.FormationProgressStatView.as_view(), name="admin-progression-stats"),
    path("progression/members/", vp.MemberProgressListView.as_view(), name="admin-progression-members"),
    path("progression/reset/", vp.ResetProgressView.as_view(), name="admin-progression-reset"),

    *router.urls,
]
