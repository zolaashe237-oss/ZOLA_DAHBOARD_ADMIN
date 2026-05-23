"""Logique d'authentification : OTP et anti-brute-force (CDC §3.3, §7.1)."""
import secrets

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.cache import cache
from django.utils import timezone

from .models import EmailOTP, User


# ─── OTP de vérification email ──────────────────────────────────────────────

def generate_otp(user: User) -> str:
    """Crée un OTP à 6 chiffres, le stocke hashé, et renvoie le code en clair.

    Le clair n'est renvoyé que pour l'envoi par email — jamais persisté.
    Les anciens OTP non consommés de l'utilisateur sont invalidés.
    """
    EmailOTP.objects.filter(user=user, consumed=False).update(consumed=True)
    code = f"{secrets.randbelow(1_000_000):06d}"
    EmailOTP.objects.create(
        user=user,
        code_hash=make_password(code),
        expires_at=timezone.now() + timezone.timedelta(minutes=settings.OTP_TTL_MINUTES),
    )
    return code


def verify_otp(user: User, code: str) -> tuple[bool, str]:
    """Vérifie un OTP. Renvoie (succès, message)."""
    otp = EmailOTP.objects.filter(user=user, consumed=False).order_by("-created_at").first()
    if otp is None or not otp.is_valid():
        return False, "Code expiré ou inexistant. Demandez un nouveau code."
    if otp.attempts >= settings.OTP_MAX_ATTEMPTS:
        otp.consumed = True
        otp.save(update_fields=["consumed"])
        return False, "Trop de tentatives. Demandez un nouveau code."

    if not check_password(code, otp.code_hash):
        otp.attempts += 1
        otp.save(update_fields=["attempts"])
        restantes = settings.OTP_MAX_ATTEMPTS - otp.attempts
        return False, f"Code incorrect. Tentatives restantes : {restantes}."

    otp.consumed = True
    otp.save(update_fields=["consumed"])
    return True, "Code validé."


# ─── Anti-brute-force connexion (Redis) ─────────────────────────────────────

def _attempts_key(identifier: str) -> str:
    return f"login_attempts:{identifier.lower()}"


def is_locked(identifier: str) -> bool:
    return cache.get(_attempts_key(identifier), 0) >= settings.LOGIN_MAX_ATTEMPTS


def register_failed_login(identifier: str) -> None:
    key = _attempts_key(identifier)
    attempts = cache.get(key, 0) + 1
    cache.set(key, attempts, timeout=settings.LOGIN_LOCKOUT_MINUTES * 60)


def reset_login_attempts(identifier: str) -> None:
    cache.delete(_attempts_key(identifier))
