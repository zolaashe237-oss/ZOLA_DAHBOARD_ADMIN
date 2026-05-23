"""Services du contenu : accès, déverrouillage séquentiel, streaming, quiz.

Implémente RG-16 à RG-28. L'accès à un contenu réservé délègue à
`apps.billing.services.has_subscription_access` via `access_subscription_types`
(le type `MEMBRE` ouvre l'accès aux membres actifs).
"""
from django.conf import settings
from django.core.files.storage import default_storage
from django.utils import timezone

from .models import Content, ContentType, QuizResult


# ─── Streaming sécurisé (RG-17, RG-19) ──────────────────────────────────────

def generate_signed_url(key: str) -> str:
    """URL signée (MinIO/R2) valable 1h pour un média, en lecture `inline`.

    Jamais l'URL directe du bucket. La signature est faite contre
    `S3_PUBLIC_ENDPOINT_URL` (host joignable par le navigateur) ; le calcul est
    hors-ligne, donc indépendant de l'endpoint interne d'upload. En dev sans S3
    (USE_S3=False), retombe sur l'URL du stockage local.
    """
    if not key:
        return ""
    if not settings.USE_S3:
        return default_storage.url(key)

    import mimetypes

    import boto3
    from botocore.client import Config

    client = boto3.client(
        "s3",
        endpoint_url=settings.S3_PUBLIC_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )
    # inline → lecture en streaming ; ResponseContentType force le bon MIME pour
    # que le navigateur lise (vidéo/audio) au lieu de télécharger.
    params = {
        "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
        "Key": key,
        "ResponseContentDisposition": "inline",
    }
    mime, _ = mimetypes.guess_type(key)
    if mime:
        params["ResponseContentType"] = mime
    return client.generate_presigned_url(
        "get_object", Params=params, ExpiresIn=settings.AWS_QUERYSTRING_EXPIRE,
    )


# ─── Déverrouillage séquentiel (RG-16, RG-26, RG-28) ────────────────────────

def _previous_module(content: Content):
    """Module actif immédiatement précédent dans la même collection, sinon None."""
    if content.collection_id is None:
        return None
    return (
        Content.objects.filter(
            collection_id=content.collection_id,
            active=True,
            order__lt=content.order,
        )
        .order_by("-order")
        .first()
    )


def is_unlocked(user, content: Content) -> bool:
    """Le membre a-t-il déverrouillé ce module ? (RG-16)

    Un module est ouvert si le module précédent de sa collection est validé
    (ou n'a pas de quiz). Hors collection ou premier module → toujours ouvert.
    """
    previous = _previous_module(content)
    if previous is None or not previous.quiz_active:
        return True
    return QuizResult.objects.filter(user=user, content=previous, validated=True).exists()


def content_accessible(user, content: Content, accessible_types=None) -> bool:
    """Le membre a-t-il l'abonnement requis pour ce contenu ? (RG-22 explicite)

    Accès si le membre détient un abonnement actif de l'UN des
    `access_subscription_types` du contenu. Liste vide = contenu libre.
    BLOQUÉ n'accède à rien. `accessible_types` (optionnel) = ensemble des types
    déjà résolus pour ce membre, pour éviter des requêtes répétées en liste.
    """
    from apps.accounts.models import UserStatus

    if user.status == UserStatus.BLOQUE:
        return False
    required = content.access_subscription_types or []
    if not required:
        return True  # contenu libre
    if accessible_types is not None:
        return any(t in accessible_types for t in required)
    from apps.billing.services import has_subscription_access
    return any(has_subscription_access(user, t) for t in required)


def access_state(user, content: Content) -> dict:
    """État d'accès complet d'un contenu pour un membre.

    Retourne {locked: bool, lock_reason: 'subscription'|'quiz'|None}.
    L'abonnement prime : sans abonnement requis détenu, le module est verrouillé.
    """
    if not content_accessible(user, content):
        return {"locked": True, "lock_reason": "subscription"}
    if not is_unlocked(user, content):
        return {"locked": True, "lock_reason": "quiz"}
    return {"locked": False, "lock_reason": None}


# ─── Quiz (RG-23 à RG-27) ───────────────────────────────────────────────────

def submit_quiz_score(user, content: Content, score: int) -> QuizResult:
    """Enregistre une tentative de quiz et applique les règles RG-23 à RG-26.

    - tentatives illimitées, +1 à chaque soumission (RG-24) ;
    - on conserve le meilleur score (RG-25) ;
    - validation si score >= seuil ; jamais de rétrogradation (RG-25/26).
    """
    result, _ = QuizResult.objects.get_or_create(user=user, content=content)
    result.attempts += 1
    if score > result.score:
        result.score = score

    if not result.validated and result.score >= content.quiz_threshold:
        result.validated = True
        result.validated_at = timezone.now()

    result.save()
    return result
