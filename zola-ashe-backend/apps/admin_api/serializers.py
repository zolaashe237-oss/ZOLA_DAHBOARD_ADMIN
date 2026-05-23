"""Serializers du back-office admin."""
from rest_framework import serializers

from apps.accounts.models import User
from apps.billing.serializers import PaymentSerializer, SubscriptionSerializer
from apps.content.models import Collection, Content, QuizResult


# ─── Membres ────────────────────────────────────────────────────────────────

class MemberListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "full_name", "role", "status",
                  "email_verified", "nb_warnings", "created_at", "last_login")


class MemberDetailSerializer(serializers.ModelSerializer):
    subscriptions = serializers.SerializerMethodField()
    payments = serializers.SerializerMethodField()
    quiz_results = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "photo", "role", "status",
                  "status_changed_at", "email_verified", "nb_warnings",
                  "created_at", "last_login", "subscriptions", "payments", "quiz_results")

    def get_subscriptions(self, obj):
        return SubscriptionSerializer(obj.subscriptions.all(), many=True).data

    def get_payments(self, obj):
        return PaymentSerializer(obj.payments.order_by("-paid_at"), many=True).data

    def get_quiz_results(self, obj):
        qs = obj.quiz_results.select_related("content")
        return [{"content": q.content_id, "title": q.content.title, "score": q.score,
                 "validated": q.validated} for q in qs]


# ─── Actions sur les membres ─────────────────────────────────────────────────

class ReasonSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=255)


# ─── Paiements admin (RG-06, RG-39, RG-40) ───────────────────────────────────

class ManualPaymentSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    kind = serializers.ChoiceField(choices=["INSCRIPTION", "COTISATION", "DON"])
    amount = serializers.IntegerField(required=False, min_value=0)
    reason = serializers.CharField(max_length=255)


class RefundSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    amount = serializers.IntegerField(min_value=1)  # montant positif → stocké négatif
    reason = serializers.CharField(max_length=255)


class ExonerationSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    reason = serializers.CharField(max_length=255)


# ─── Contenu & collections (RG-15, RG-20, RG-21) ─────────────────────────────

class AdminCollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = ("id", "title", "description", "content_type", "category", "order", "active")


class AdminContentSerializer(serializers.ModelSerializer):
    thumbnail = serializers.SerializerMethodField()  # URL signée de la miniature MinIO

    class Meta:
        model = Content
        fields = ("id", "content_type", "title", "description", "category", "order", "active",
                  "collection", "access_subscription_types", "thumbnail_url", "thumbnail_key",
                  "thumbnail", "quiz_url", "quiz_threshold", "quiz_active", "bucket_key",
                  "nb_pages", "duration_sec", "size_mo", "audio_format", "created_at")
        read_only_fields = ("id", "created_at")

    def get_thumbnail(self, obj) -> str:
        from apps.content.services import generate_signed_url
        if obj.thumbnail_key:
            return generate_signed_url(obj.thumbnail_key)
        return obj.thumbnail_url  # repli sur la miniature externe éventuelle

    def validate_access_subscription_types(self, value):
        """Liste de types d'abonnement valides ([] = contenu libre)."""
        from apps.billing.models import SubscriptionType
        if not isinstance(value, list):
            raise serializers.ValidationError("Une liste de types d'abonnement est attendue.")
        valid = set(SubscriptionType.values)
        invalid = [v for v in value if v not in valid]
        if invalid:
            raise serializers.ValidationError(
                f"Types d'abonnement inconnus : {invalid}. Valides : {sorted(valid)}.")
        return value

    def validate(self, attrs):
        # RG-15 : un contenu ne peut rejoindre qu'une collection de même type.
        collection = attrs.get("collection") or getattr(self.instance, "collection", None)
        content_type = attrs.get("content_type") or getattr(self.instance, "content_type", None)
        if collection and content_type and collection.content_type != content_type:
            raise serializers.ValidationError(
                {"collection": "Le type du contenu doit correspondre à celui de la collection (RG-15)."})
        return attrs


class UploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    content_type = serializers.ChoiceField(choices=["VIDEO", "PDF", "AUDIO", "IMAGE"])


# ─── Quiz admin (RG-27) ──────────────────────────────────────────────────────

class QuizScoreSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    score = serializers.IntegerField(min_value=0, max_value=20)


class ResetQuizSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    content_id = serializers.IntegerField()
    reason = serializers.CharField(max_length=255)


# ─── Publication admin (annonces) ────────────────────────────────────────────

class AdminPostSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    audience = serializers.ChoiceField(choices=["TOUS", "FEMME", "ENFANT"], default="TOUS")
    is_pinned = serializers.BooleanField(default=False)
    is_announcement = serializers.BooleanField(default=False)
    scheduled_at = serializers.DateTimeField(required=False, allow_null=True)
