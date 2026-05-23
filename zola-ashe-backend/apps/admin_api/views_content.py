"""Back-office — contenu, collections, quiz et annonces (CDC §5.4, §5.6)."""
from uuid import uuid4

from django.core.files.storage import default_storage
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import AuditAction
from apps.audit.services import record
from apps.community.models import Audience, Post
from apps.content.models import Collection, Content, QuizResult
from apps.content.services import generate_signed_url, submit_quiz_score

from .permissions import IsAdmin
from .serializers import (
    AdminCollectionSerializer,
    AdminContentSerializer,
    AdminPostSerializer,
    QuizScoreSerializer,
    ResetQuizSerializer,
    UploadSerializer,
)

# Limites d'upload (CDC §5.4) : PDF 50 Mo, audio 100 Mo, vidéo 500 Mo, miniature 5 Mo.
_MAX_SIZE = {"PDF": 50 * 1024 * 1024, "AUDIO": 100 * 1024 * 1024,
             "VIDEO": 500 * 1024 * 1024, "IMAGE": 5 * 1024 * 1024}
_PREFIX = {"PDF": "pdfs", "AUDIO": "audios", "VIDEO": "videos", "IMAGE": "thumbnails"}
_MAX_PINNED = 3  # CDC §4.2


class AdminContentViewSet(viewsets.ModelViewSet):
    """CRUD complet du catalogue (contenus actifs et brouillons)."""
    serializer_class = AdminContentSerializer
    permission_classes = [IsAdmin]
    queryset = Content.objects.all().order_by("category", "order")

    def perform_create(self, serializer):
        content = serializer.save()
        record(self.request.user, AuditAction.UPDATE_CONTENT, target_type="Content",
               target_id=content.id, payload={"created": True})

    def perform_update(self, serializer):
        content = serializer.save()
        record(self.request.user, AuditAction.UPDATE_CONTENT, target_type="Content",
               target_id=content.id)

    def destroy(self, request, *args, **kwargs):
        """Suppression logique (RG-20) : actif = FALSE, fichier conservé."""
        content = self.get_object()
        content.active = False
        content.save(update_fields=["active"])
        record(request.user, AuditAction.DELETE_CONTENT, target_type="Content", target_id=content.id)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"])
    def preview(self, request, pk=None):
        """URL signée du média pour prévisualisation admin (sans contrôle d'abonnement)."""
        content = self.get_object()
        if not content.bucket_key:
            return Response({"detail": "Aucun média n'est rattaché à ce contenu."},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response({"url": generate_signed_url(content.bucket_key),
                         "content_type": content.content_type})


class AdminCollectionViewSet(viewsets.ModelViewSet):
    serializer_class = AdminCollectionSerializer
    permission_classes = [IsAdmin]
    queryset = Collection.objects.all().order_by("order")

    def destroy(self, request, *args, **kwargs):
        """RG-21 : détacher les contenus (collection=NULL) et désactiver la collection."""
        collection = self.get_object()
        Content.objects.filter(collection=collection).update(collection=None)
        collection.active = False
        collection.save(update_fields=["active"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ContentUploadView(APIView):
    """Upload d'un fichier vidéo/PDF/audio vers le bucket (MinIO/R2). Retourne la clé."""
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = UploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        file = serializer.validated_data["file"]
        ctype = serializer.validated_data["content_type"]
        if file.size > _MAX_SIZE[ctype]:
            limit = _MAX_SIZE[ctype] // (1024 * 1024)
            return Response({"detail": f"Fichier trop volumineux (max {limit} Mo)."},
                            status=status.HTTP_400_BAD_REQUEST)
        key = f"{_PREFIX[ctype]}/{uuid4().hex}_{file.name}"
        saved = default_storage.save(key, file)
        return Response({"bucket_key": saved, "size_mo": round(file.size / (1024 * 1024), 2)},
                        status=status.HTTP_201_CREATED)


class QuizScoreView(APIView):
    """Saisie manuelle d'un score de quiz pour un membre (CDC §5.6)."""
    permission_classes = [IsAdmin]

    def post(self, request, pk=None):
        serializer = QuizScoreSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        content = Content.objects.filter(id=pk).first()
        if content is None:
            return Response({"detail": "Contenu introuvable."}, status=status.HTTP_404_NOT_FOUND)
        from apps.accounts.models import User
        user = User.objects.filter(id=serializer.validated_data["user_id"]).first()
        if user is None:
            return Response({"detail": "Membre introuvable."}, status=status.HTTP_404_NOT_FOUND)
        result = submit_quiz_score(user, content, serializer.validated_data["score"])
        return Response({"score": result.score, "validated": result.validated})


class ResetQuizView(APIView):
    """Réinitialise les tentatives d'un membre pour un module (RG-27, motif requis)."""
    permission_classes = [IsAdmin]

    def post(self, request):
        serializer = ResetQuizSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        result = QuizResult.objects.filter(
            user_id=data["user_id"], content_id=data["content_id"]).first()
        if result is None:
            return Response({"detail": "Aucun résultat à réinitialiser."}, status=status.HTTP_404_NOT_FOUND)
        result.validated = False
        result.score = 0
        result.attempts = 0
        result.validated_at = None
        result.save()
        record(request.user, AuditAction.RESET_QUIZ, target_type="QuizResult", target_id=result.id,
               reason=data["reason"], payload={"user_id": data["user_id"], "content_id": data["content_id"]})
        return Response({"detail": "Quiz réinitialisé."})


class AdminPostCreateView(APIView):
    """Publication admin : annonce / post épinglé / programmé (CDC §5.4)."""
    permission_classes = [IsAdmin]

    def post(self, request):
        serializer = AdminPostSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if data["is_pinned"] and Post.objects.filter(is_pinned=True, active=True).count() >= _MAX_PINNED:
            return Response({"detail": f"Maximum {_MAX_PINNED} posts épinglés."},
                            status=status.HTTP_400_BAD_REQUEST)
        post = Post.objects.create(
            author=request.user,
            text=data.get("text", ""),
            audience=data["audience"],
            is_pinned=data["is_pinned"],
            is_announcement=data["is_announcement"],
            scheduled_at=data.get("scheduled_at"),
        )
        return Response({"id": post.id}, status=status.HTTP_201_CREATED)
