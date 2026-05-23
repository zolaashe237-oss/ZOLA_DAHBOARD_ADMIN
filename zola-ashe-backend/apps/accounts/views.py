"""Vues d'authentification et de profil (CDC §3.3, §7.1).

Stratégie tokens : l'access JWT est renvoyé dans le corps (gardé en mémoire côté
front), le refresh est posé dans un cookie HttpOnly — invisible au JavaScript,
donc protégé du XSS. Le refresh tourne à chaque rafraîchissement (rotation +
blacklist via SimpleJWT).
"""
from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .models import User, UserStatus
from .serializers import (
    LoginSerializer,
    PasswordChangeSerializer,
    PasswordForgotSerializer,
    PasswordResetSerializer,
    RegisterSerializer,
    ResendOTPSerializer,
    UserSerializer,
    VerifyOTPSerializer,
)
from .services import (
    generate_otp,
    is_locked,
    register_failed_login,
    reset_login_attempts,
    verify_otp,
)
from .tasks import send_otp_email

REFRESH_COOKIE = "refresh_token"
REFRESH_COOKIE_PATH = "/api/auth/"


def _set_refresh_cookie(response: Response, refresh: str) -> None:
    response.set_cookie(
        REFRESH_COOKIE,
        refresh,
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        httponly=True,                 # inaccessible au JS (anti-XSS)
        secure=not settings.DEBUG,     # HTTPS only en prod
        samesite="Lax",               # api/app partagent le même site
        path=REFRESH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(REFRESH_COOKIE, path=REFRESH_COOKIE_PATH)


def _issue_tokens(user: User) -> tuple[str, str]:
    """Retourne (access, refresh). Session admin raccourcie à 4h (CDC §5.1)."""
    refresh = RefreshToken.for_user(user)
    access = refresh.access_token
    if user.role == "ADMIN":
        access.set_exp(lifetime=settings.ADMIN_ACCESS_TOKEN_LIFETIME)
    return str(access), str(refresh)


class _AuthThrottle(ScopedRateThrottle):
    scope = "auth"


class RegisterView(generics.GenericAPIView):
    """Inscription → crée le compte (RESTREINT) puis envoie un OTP d'activation."""
    permission_classes = [AllowAny]
    throttle_classes = [_AuthThrottle]
    serializer_class = RegisterSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        code = generate_otp(user)
        send_otp_email.delay(user.email, code, "verification")
        return Response(
            {"detail": "Compte créé. Un code de vérification a été envoyé par email."},
            status=status.HTTP_201_CREATED,
        )


class VerifyOTPView(generics.GenericAPIView):
    """Valide l'OTP et active l'email du compte."""
    permission_classes = [AllowAny]
    throttle_classes = [_AuthThrottle]
    serializer_class = VerifyOTPSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=serializer.validated_data["email"]).first()
        if user is None:
            return Response({"detail": "Compte introuvable."}, status=status.HTTP_404_NOT_FOUND)

        ok, message = verify_otp(user, serializer.validated_data["code"])
        if not ok:
            return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)

        if not user.email_verified:
            user.email_verified = True
            user.save(update_fields=["email_verified"])
        return Response({"detail": "Email vérifié. Vous pouvez vous connecter."})


class ResendOTPView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    throttle_classes = [_AuthThrottle]
    serializer_class = ResendOTPSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=serializer.validated_data["email"]).first()
        if user and not user.email_verified:
            code = generate_otp(user)
            send_otp_email.delay(user.email, code, "verification")
        # Réponse neutre : ne révèle pas l'existence du compte.
        return Response({"detail": "Si un compte non vérifié existe, un code a été renvoyé."})


class LoginView(generics.GenericAPIView):
    """Connexion : anti-brute-force (5 essais / 15 min) puis émission des tokens."""
    permission_classes = [AllowAny]
    throttle_classes = [_AuthThrottle]
    serializer_class = LoginSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        password = serializer.validated_data["password"]

        if is_locked(email):
            return Response(
                {"detail": "Trop de tentatives. Réessayez dans quelques minutes."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        user = authenticate(request, username=email, password=password)
        if user is None:
            register_failed_login(email)
            return Response({"detail": "Identifiants invalides."},
                            status=status.HTTP_401_UNAUTHORIZED)
        if not user.email_verified:
            return Response({"detail": "Veuillez d'abord vérifier votre email."},
                            status=status.HTTP_403_FORBIDDEN)
        if user.status == UserStatus.BLOQUE:
            return Response({"detail": "Compte bloqué. Contactez l'administration."},
                            status=status.HTTP_403_FORBIDDEN)

        reset_login_attempts(email)
        access, refresh = _issue_tokens(user)
        response = Response({"access": access, "user": UserSerializer(user).data})
        _set_refresh_cookie(response, refresh)
        return response


class CookieTokenRefreshView(TokenRefreshView):
    """Rafraîchit l'access en lisant le refresh dans le cookie HttpOnly."""
    permission_classes = [AllowAny]
    throttle_classes = [_AuthThrottle]

    def post(self, request, *args, **kwargs):
        refresh = request.COOKIES.get(REFRESH_COOKIE)
        if not refresh:
            return Response({"detail": "Refresh token absent."},
                            status=status.HTTP_401_UNAUTHORIZED)
        serializer = self.get_serializer(data={"refresh": refresh})
        try:
            serializer.is_valid(raise_exception=True)
        except (TokenError, InvalidToken):
            response = Response({"detail": "Session expirée."},
                                status=status.HTTP_401_UNAUTHORIZED)
            _clear_refresh_cookie(response)
            return response

        data = serializer.validated_data
        response = Response({"access": data["access"]})
        # ROTATE_REFRESH_TOKENS=True → un nouveau refresh est renvoyé : on le repose.
        if "refresh" in data:
            _set_refresh_cookie(response, data["refresh"])
        return response


class LogoutView(APIView):
    """Déconnexion : blackliste le refresh courant et efface le cookie."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh = request.COOKIES.get(REFRESH_COOKIE)
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except TokenError:
                pass
        response = Response({"detail": "Déconnecté."})
        _clear_refresh_cookie(response)
        return response


class PasswordForgotView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    throttle_classes = [_AuthThrottle]
    serializer_class = PasswordForgotSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=serializer.validated_data["email"]).first()
        if user:
            code = generate_otp(user)
            send_otp_email.delay(user.email, code, "reset")
        # Réponse neutre (pas d'énumération d'emails).
        return Response({"detail": "Si un compte existe, un code de réinitialisation a été envoyé."})


class PasswordResetView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    throttle_classes = [_AuthThrottle]
    serializer_class = PasswordResetSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=serializer.validated_data["email"]).first()
        if user is None:
            return Response({"detail": "Compte introuvable."}, status=status.HTTP_404_NOT_FOUND)

        ok, message = verify_otp(user, serializer.validated_data["code"])
        if not ok:
            return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Mot de passe réinitialisé."})


class PasswordChangeView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PasswordChangeSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not request.user.check_password(serializer.validated_data["old_password"]):
            return Response({"detail": "Ancien mot de passe incorrect."},
                            status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        return Response({"detail": "Mot de passe modifié."})


class MeView(generics.RetrieveUpdateAPIView):
    """Profil du membre connecté (GET / PATCH)."""
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user
