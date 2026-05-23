"""Serializers du contenu (lecture membre). `bucket_key` n'est jamais exposé :
les fichiers PDF/audio passent par l'endpoint de streaming signé (RG-17/19).
"""
from rest_framework import serializers

from .models import Collection, Content, QuizResult
from .services import content_accessible, generate_signed_url, is_unlocked


def _thumbnail(obj) -> str:
    """URL signée de la miniature (MinIO) ou miniature externe en repli."""
    if obj.thumbnail_key:
        return generate_signed_url(obj.thumbnail_key)
    return obj.thumbnail_url


class CollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = ("id", "title", "description", "content_type", "category", "order")


class _AccessMixin(serializers.Serializer):
    """Ajoute l'état d'accès (verrouillage abonnement/quiz) calculé par membre."""
    access = serializers.SerializerMethodField()

    def _access_state(self, obj) -> dict:
        """État de verrouillage (abonnement puis quiz) pour le membre courant."""
        user = self.context["request"].user
        # `accessible_sub_types` (optionnel) : ensemble pré-calculé pour la liste.
        types = self.context.get("accessible_sub_types")
        if not content_accessible(user, obj, accessible_types=types):
            return {"locked": True, "lock_reason": "subscription"}
        if not is_unlocked(user, obj):
            return {"locked": True, "lock_reason": "quiz"}
        return {"locked": False, "lock_reason": None}

    def get_access(self, obj) -> dict:
        return self._access_state(obj)


class ContentListSerializer(_AccessMixin, serializers.ModelSerializer):
    thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = Content
        fields = ("id", "content_type", "title", "description", "category", "order",
                  "collection", "thumbnail", "quiz_active",
                  "access_subscription_types", "access")

    def get_thumbnail(self, obj) -> str:
        return _thumbnail(obj)


class ContentDetailSerializer(_AccessMixin, serializers.ModelSerializer):
    stream_available = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()
    # quiz_url est une ressource protégée : exposée seulement si le module est
    # déverrouillé. La vidéo, elle, ne s'expose JAMAIS en clair : elle passe par
    # l'endpoint /stream/ qui renvoie une URL signée (comme PDF/audio, RG-17/19).
    quiz_url = serializers.SerializerMethodField()

    class Meta:
        model = Content
        fields = ("id", "content_type", "title", "description", "category", "order",
                  "collection", "thumbnail", "quiz_active", "quiz_threshold",
                  "quiz_url", "nb_pages", "duration_sec", "size_mo",
                  "audio_format", "stream_available", "access_subscription_types", "access")

    def get_stream_available(self, obj) -> bool:
        # Tout média (vidéo, PDF, audio) stocké se lit via /stream/ (URL signée).
        return bool(obj.bucket_key)

    def get_thumbnail(self, obj) -> str:
        return _thumbnail(obj)

    def get_quiz_url(self, obj) -> str:
        return "" if self._access_state(obj)["locked"] else obj.quiz_url


class QuizResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizResult
        fields = ("content", "score", "attempts", "validated", "validated_at")
        read_only_fields = fields


class QuizSubmitSerializer(serializers.Serializer):
    score = serializers.IntegerField(min_value=0, max_value=20)
