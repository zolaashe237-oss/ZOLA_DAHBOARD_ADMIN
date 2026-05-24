"""Services d'adhésion, de paiement et de contrôle d'accès.

Modèle du livret : un **droit d'inscription** unique ouvre l'adhésion (`MEMBRE`,
permanente) et passe le membre ACTIF ; la **cotisation mensuelle** maintient
l'accès (RESTREINT au-delà du délai de grâce) ; le **don** est facultatif et
sans effet sur l'accès. Importé par `content`/`community` pour l'accès, et par
les vues/webhook billing pour l'initiation et l'activation des paiements.
"""
from dataclasses import dataclass
from datetime import timedelta
from uuid import uuid4

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import Role, User, UserStatus

from . import swinmo
from .models import (
    Payment,
    PaymentStatus,
    PaymentType,
    Subscription,
    SubscriptionType,
)


def is_member(user) -> bool:
    """Le membre a-t-il réglé son droit d'inscription (adhésion active) ?"""
    return Subscription.objects.filter(
        user=user, type=SubscriptionType.MEMBRE, active=True).exists()


def has_subscription_access(user, sub_type: str) -> bool:
    """Le membre détient-il l'accès via ce type d'abonnement ?

    Un seul type existe (`MEMBRE`) : l'accès au contenu réservé exige un membre
    ACTIF (adhérent dont la cotisation est à jour). BLOQUÉ n'a aucun accès.
    """
    if user.status == UserStatus.BLOQUE:
        return False
    if sub_type == SubscriptionType.MEMBRE:
        return user.status == UserStatus.ACTIF
    return False


# ─── Catalogue des paiements (kind → tarif/produit Swinmo) ──────────────────

@dataclass(frozen=True)
class Plan:
    kind: str
    product_id: str
    amount: int
    payment_type: str
    subscription_type: str | None


def resolve_plan(kind: str) -> Plan:
    """Traduit un `kind` d'achat en tarif, produit Swinmo et types métier."""
    plans = {
        "INSCRIPTION": Plan("INSCRIPTION", settings.SWINMO_PRODUCT_INSCRIPTION,
                            settings.PRICE_INSCRIPTION, PaymentType.INSCRIPTION,
                            SubscriptionType.MEMBRE),
        "COTISATION": Plan("COTISATION", settings.SWINMO_PRODUCT_COTISATION,
                           settings.PRICE_COTISATION, PaymentType.COTISATION, None),
        "DON": Plan("DON", settings.SWINMO_PRODUCT_DON, settings.DON_MIN_AMOUNT,
                    PaymentType.DON, None),
    }
    if kind not in plans:
        raise ValueError(f"Type d'achat inconnu : {kind}")
    return plans[kind]


# ─── Initiation d'un paiement (création du lien Swinmo) ─────────────────────

def initiate_payment(user, kind: str, amount: int | None = None) -> dict:
    """Crée un PAYMENTS EN_ATTENTE et le lien de paiement Swinmo.

    Notre `reference` interne (UUID) est stockée dans `swinmo_ref` et renvoyée
    dans le `metadata` Swinmo → réconciliation et idempotence au webhook (RG-08).
    Pour un don, `amount` (libre) prime sur le montant plancher du plan.
    """
    plan = resolve_plan(kind)
    effective_amount = amount if (kind == "DON" and amount) else plan.amount
    reference = uuid4().hex

    payment = Payment.objects.create(
        user=user,
        type=plan.payment_type,
        status=PaymentStatus.EN_ATTENTE,
        amount=effective_amount,
        swinmo_ref=reference,
    )

    # Mode MOCK (aucune clé Swinmo) : on renvoie une page de paiement simulé du
    # front au lieu d'appeler l'API externe → le parcours reste complet en local.
    if settings.SWINMO_MOCK:
        checkout_url = (f"{settings.WEB_BASE_URL}/paiement/simulation"
                        f"?ref={reference}&kind={kind}&amount={effective_amount}")
        return {"payment_id": payment.id, "reference": reference,
                "amount": effective_amount, "checkout_url": checkout_url, "mock": True}

    metadata = {"reference": reference, "user_id": user.id, "kind": kind}
    response = swinmo.create_checkout_link(plan.product_id, effective_amount, user.email, metadata)
    return {
        "payment_id": payment.id,
        "reference": reference,
        "amount": effective_amount,
        "checkout_url": swinmo.extract_checkout_url(response),
    }


def confirm_mock_payment(user, reference: str) -> str:
    """Confirme un paiement simulé (mode MOCK uniquement). Active le paiement
    en attente de l'utilisateur, comme le ferait le webhook Swinmo."""
    if not settings.SWINMO_MOCK:
        raise ValueError("Confirmation simulée indisponible (Swinmo configuré).")
    payment = Payment.objects.filter(
        user=user, swinmo_ref=reference, status=PaymentStatus.EN_ATTENTE).first()
    if payment is None:
        raise ValueError("Paiement introuvable ou déjà traité.")
    # kind == type (INSCRIPTION / COTISATION / DON) dans le modèle du livret.
    activate_paid_payment(payment, payment.type)
    return payment.type


# ─── Activation après paiement confirmé ─────────────────────────────────────

@transaction.atomic
def activate_paid_payment(payment: Payment, kind: str) -> None:
    """Marque le paiement VALIDE et applique les effets métier selon le `kind`."""
    payment.status = PaymentStatus.VALIDE
    user = payment.user

    if kind == "INSCRIPTION":
        # Ouvre (ou réactive) l'adhésion permanente et passe le membre ACTIF.
        sub, _ = Subscription.objects.get_or_create(
            user=user, type=SubscriptionType.MEMBRE, active=True,
            defaults={"start": timezone.now().date(), "end": None},
        )
        payment.subscription = sub
        user.set_status(UserStatus.ACTIF)

    elif kind == "COTISATION":
        # La cotisation à jour restaure l'accès d'un adhérent restreint.
        if is_member(user) and user.status == UserStatus.RESTREINT:
            user.set_status(UserStatus.ACTIF)

    elif kind == "DON":
        pass  # facultatif, aucun effet sur l'accès

    payment.save()
    _send_confirmation(user.email, kind)


def _send_confirmation(email: str, kind: str) -> None:
    from .tasks import send_confirmation_email
    send_confirmation_email.delay(email, kind)


# ─── Traitement d'un webhook Swinmo (RG-01, RG-08) ──────────────────────────

def process_webhook_event(event: str, data: dict) -> str:
    """Traite un événement webhook déjà authentifié. Retourne un libellé d'issue.

    Idempotent : un `order.paid` rejoué sur un paiement déjà VALIDE est ignoré.
    """
    reference = (data.get("metadata") or {}).get("reference")
    if not reference:
        return "no-reference"

    payment = Payment.objects.filter(swinmo_ref=reference).first()
    if payment is None:
        return "unknown-payment"

    if event == "order.paid":
        if payment.status == PaymentStatus.VALIDE:
            return "duplicate"            # RG-08 : déjà traité
        kind = (data.get("metadata") or {}).get("kind", "")
        activate_paid_payment(payment, kind)
        return "activated"

    if event == "order.failed":
        if payment.status != PaymentStatus.VALIDE:
            payment.status = PaymentStatus.ECHOUE
            payment.save(update_fields=["status"])
        return "failed"

    return "ignored-event"


# ─── Cron quotidien des statuts (RG-02, RG-03) ──────────────────────────────

def _last_contribution_date(user):
    """Date de la dernière contribution validée (inscription ou cotisation)."""
    last = (
        Payment.objects.filter(
            user=user,
            type__in=[PaymentType.INSCRIPTION, PaymentType.COTISATION],
            status=PaymentStatus.VALIDE,
        )
        .order_by("-paid_at").first()
    )
    if last:
        return last.paid_at.date()
    sub = Subscription.objects.filter(
        user=user, type=SubscriptionType.MEMBRE, active=True).order_by("start").first()
    return sub.start if sub else None


def run_daily_status_check() -> dict:
    """Recalcule les statuts membres et déclenche les rappels (RG-02/03).

    Pour chaque adhérent ACTIF : si la dernière contribution dépasse le délai de
    grâce → RESTREINT ; sinon rappels de cotisation à J1/J7/J15. Un ACTIF forcé
    par l'admin dans les dernières 24h n'est pas modifié (exception RG-02).
    """
    from .tasks import send_payment_reminder

    now = timezone.now()
    today = now.date()
    restricted, reminders = 0, 0
    grace = settings.COTISATION_GRACE_DAYS

    for user in User.objects.filter(status=UserStatus.ACTIF, role=Role.MEMBER):
        # Exception RG-02 : ne pas écraser un ACTIF forcé manuellement < 24h.
        if user.status_changed_at >= now - timedelta(hours=24):
            continue
        if not is_member(user):
            continue  # pas d'adhésion : rien à recalculer

        reference = _last_contribution_date(user) or today
        days_late = (today - reference).days
        if days_late > grace:
            user.set_status(UserStatus.RESTREINT)
            restricted += 1
        elif days_late in (1, 7, 15):
            send_payment_reminder.delay(user.id)
            reminders += 1

    return {"restricted": restricted, "reminders": reminders}
