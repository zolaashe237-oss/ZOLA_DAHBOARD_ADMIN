"""Back-office — modération du fil et consultation de l'audit (CDC §5.5, §7.6)."""
from django.db.models import Count
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import AuditAction, AuditLog
from apps.audit.serializers import AuditLogSerializer
from apps.audit.services import record
from apps.community.models import Comment, Like, Post, Report

from .permissions import IsAdmin


class ReportQueueView(APIView):
    """File de modération priorisée (CDC §5.5)."""
    permission_classes = [IsAdmin]

    def get(self, _request):
        # Compte de signalements par cible (priorisation).
        counts = {
            (r["target_type"], r["target_id"]): r["n"]
            for r in Report.objects.filter(handled=False)
            .values("target_type", "target_id").annotate(n=Count("id"))
        }
        items = []
        for report in Report.objects.filter(handled=False).select_related("reporter").order_by("-created_at"):
            items.append({
                "id": report.id,
                "target_type": report.target_type,
                "target_id": report.target_id,
                "reason": report.reason,
                "reporter": report.reporter.email,
                "signal_count": counts.get((report.target_type, report.target_id), 1),
                "created_at": report.created_at,
            })
        return Response(items)


class HandleReportView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk=None):
        report = Report.objects.filter(id=pk).first()
        if report is None:
            return Response({"detail": "Signalement introuvable."}, status=status.HTTP_404_NOT_FOUND)
        report.handled = True
        report.save(update_fields=["handled"])
        return Response({"detail": "Signalement traité."})


class AdminDeletePostView(APIView):
    """Suppression d'un post par modération (RG-33) — cascade logique."""
    permission_classes = [IsAdmin]

    def post(self, request, pk=None):
        post = Post.objects.filter(id=pk).first()
        if post is None:
            return Response({"detail": "Publication introuvable."}, status=status.HTTP_404_NOT_FOUND)
        reason = request.data.get("reason", "")
        post.active = False
        post.likes_count = 0
        post.save(update_fields=["active", "likes_count"])
        Comment.objects.filter(post=post).update(active=False)
        Like.objects.filter(post=post).delete()
        record(request.user, AuditAction.DELETE_POST, target_type="Post", target_id=post.id, reason=reason)
        # TODO : notifier l'auteur du motif (email/in-app).
        return Response({"detail": "Publication supprimée."})


class AdminDeleteCommentView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk=None):
        comment = Comment.objects.filter(id=pk).first()
        if comment is None:
            return Response({"detail": "Commentaire introuvable."}, status=status.HTTP_404_NOT_FOUND)
        reason = request.data.get("reason", "")
        comment.active = False
        comment.save(update_fields=["active"])
        record(request.user, AuditAction.DELETE_COMMENT, target_type="Comment",
               target_id=comment.id, reason=reason)
        return Response({"detail": "Commentaire supprimé."})


class AuditLogListView(generics.ListAPIView):
    """Consultation du journal d'audit (lecture seule, filtrable)."""
    permission_classes = [IsAdmin]
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        qs = AuditLog.objects.select_related("actor").all()
        params = self.request.query_params
        if action := params.get("action"):
            qs = qs.filter(action=action)
        if actor := params.get("actor"):
            qs = qs.filter(actor_id=actor)
        return qs
