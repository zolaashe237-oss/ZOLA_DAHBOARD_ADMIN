"""Vues membre du contenu : catalogue, streaming signé et quiz (RG-16 à RG-28)."""
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Collection, Content, QuizResult
from .serializers import (
    CollectionSerializer,
    ContentDetailSerializer,
    ContentListSerializer,
    QuizResultSerializer,
    QuizSubmitSerializer,
)
from .services import access_state, generate_signed_url, submit_quiz_score


def _accessible_sub_types(user) -> set[str]:
    """Types d'abonnement ouvrant un accès au membre (calculé une fois par requête)."""
    from apps.billing.models import SubscriptionType
    from apps.billing.services import has_subscription_access
    return {t for t in SubscriptionType.values if has_subscription_access(user, t)}


class ContentViewSet(viewsets.ReadOnlyModelViewSet):
    """Catalogue des contenus actifs + actions streaming et quiz."""

    def get_queryset(self):
        qs = Content.objects.filter(active=True)
        params = self.request.query_params
        if category := params.get("category"):
            qs = qs.filter(category=category)
        if ctype := params.get("content_type"):
            qs = qs.filter(content_type=ctype)
        if collection := params.get("collection"):
            qs = qs.filter(collection_id=collection)
        return qs

    def get_serializer_class(self):
        return ContentDetailSerializer if self.action == "retrieve" else ContentListSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["accessible_sub_types"] = _accessible_sub_types(self.request.user)
        return ctx

    @action(detail=True, methods=["get"], url_path="stream")
    def stream(self, request, pk=None):
        """URL signée (1h) pour un média déverrouillé — vidéo, PDF ou audio (RG-17/19).

        Toutes les ressources (vidéo comprise) sont servies depuis le stockage
        objet via URL signée ; jamais d'URL publique ni de lien YouTube.
        """
        content = self.get_object()
        if not content.bucket_key:
            return Response(
                {"detail": "Aucun média n'est rattaché à ce contenu."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        state = access_state(request.user, content)
        if state["locked"]:
            return Response(
                {"detail": "Contenu verrouillé.", "lock_reason": state["lock_reason"]},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response({"url": generate_signed_url(content.bucket_key), "expires_in": 3600})

    @action(detail=True, methods=["post"], url_path="quiz/submit")
    def quiz_submit(self, request, pk=None):
        """Soumet un score de quiz et applique RG-23 à RG-26."""
        content = self.get_object()
        if not content.quiz_active:
            return Response({"detail": "Ce module n'a pas de quiz."},
                            status=status.HTTP_400_BAD_REQUEST)
        state = access_state(request.user, content)
        if state["locked"]:
            return Response(
                {"detail": "Contenu verrouillé.", "lock_reason": state["lock_reason"]},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = QuizSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = submit_quiz_score(request.user, content, serializer.validated_data["score"])
        return Response(QuizResultSerializer(result).data)

    @action(detail=True, methods=["get"], url_path="quiz/result")
    def quiz_result(self, request, pk=None):
        """Résultat de quiz du membre pour ce contenu (vide si aucune tentative)."""
        content = self.get_object()
        result = QuizResult.objects.filter(user=request.user, content=content).first()
        if result is None:
            return Response({})
        return Response(QuizResultSerializer(result).data)


class CollectionViewSet(viewsets.ReadOnlyModelViewSet):
    """Collections actives + leurs contenus ordonnés (avec état d'accès)."""
    serializer_class = CollectionSerializer

    def get_queryset(self):
        qs = Collection.objects.filter(active=True)
        if category := self.request.query_params.get("category"):
            qs = qs.filter(category=category)
        return qs

    def retrieve(self, request, *args, **kwargs):
        collection = self.get_object()
        contents = Content.objects.filter(collection=collection, active=True)
        ctx = {"request": request, "accessible_sub_types": _accessible_sub_types(request.user)}
        return Response({
            **CollectionSerializer(collection).data,
            "contents": ContentListSerializer(contents, many=True, context=ctx).data,
        })
