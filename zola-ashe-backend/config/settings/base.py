"""
Réglages communs à tous les environnements — Plateforme ZOLA ASHÉ.
Les valeurs sensibles et propres à un environnement sont lues depuis .env
(voir dev.py / prod.py). Aucune clé secrète n'est écrite en dur (CDC §7.4).
"""
from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DEBUG=(bool, False),
)
# Charge backend/.env s'il existe (dev local). En prod, les variables
# viennent de l'environnement du conteneur.
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("DJANGO_SECRET_KEY", default="change-me-in-env")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# --- Applications -----------------------------------------------------------
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_celery_beat",
    "storages",
]

LOCAL_APPS = [
    "apps.accounts",
    "apps.community",
    "apps.content",
    "apps.billing",
    "apps.admin_api",
    "apps.audit",
    "apps.blog",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# --- Base de données (PostgreSQL) -------------------------------------------
# Branchée par URL → bascule conteneur ↔ managé (Supabase/Neon) sans toucher au code.
DATABASES = {
    "default": env.db("DATABASE_URL", default="postgres://zola:zola@db:5432/zola"),
}
# Derrière PgBouncer en mode transaction : psycopg3 ne doit pas utiliser de
# prepared statements ni de curseurs côté serveur (incompatibles avec le pooling).
if env.bool("USE_PGBOUNCER", default=False):
    DATABASES["default"].setdefault("OPTIONS", {})
    DATABASES["default"]["OPTIONS"]["prepare_threshold"] = None
    DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = True

# Réplica en lecture optionnel (étape de scaling) :
_replica = env("DATABASE_REPLICA_URL", default="")
if _replica:
    DATABASES["replica"] = env.db_url_config(_replica)
    DATABASE_ROUTERS = ["config.db_routers.PrimaryReplicaRouter"]

# --- Cache & Celery (Redis) -------------------------------------------------
REDIS_URL = env("REDIS_URL", default="redis://redis:6379/0")
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_URL,
    }
}
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default=REDIS_URL)
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default=REDIS_URL)
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_TASK_ACKS_LATE = True

# --- Authentification -------------------------------------------------------
AUTH_USER_MODEL = "accounts.User"

# Argon2 en tête (CDC : meilleur que bcrypt) ; bcrypt conservé pour migration.
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- DRF & JWT --------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/min",      # CDC §7.3 : 100 req/min/IP
        "user": "100/min",
        "auth": "20/min",       # routes d'authentification : 20 req/min/IP
    },
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,            # CDC §8.4 : 20 éléments / page
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=7),     # membres (CDC §7.1)
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": env("JWT_SIGNING_KEY", default=SECRET_KEY),
}
ADMIN_ACCESS_TOKEN_LIFETIME = timedelta(hours=4)    # session admin courte (CDC §5.1)

# --- CORS / CSRF (frontend Next.js) -----------------------------------------
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=["http://localhost:3000"])
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=["http://localhost:3000"])
# Les frontends envoient le cookie refresh (axios withCredentials) → le navigateur
# exige Access-Control-Allow-Credentials: true, sinon il bloque TOUTE réponse (login compris).
CORS_ALLOW_CREDENTIALS = True

# --- Stockage objet (Cloudflare R2, compatible S3) --------------------------
USE_S3 = env.bool("USE_S3", default=False)
if USE_S3:
    STORAGES = {
        "default": {"BACKEND": "storages.backends.s3.S3Storage"},
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    }
    AWS_ACCESS_KEY_ID = env("R2_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = env("R2_SECRET_ACCESS_KEY")
    AWS_STORAGE_BUCKET_NAME = env("R2_BUCKET")
    AWS_S3_ENDPOINT_URL = env("R2_ENDPOINT_URL")
    # Endpoint utilisé pour SIGNER les URLs destinées au navigateur. En dev,
    # l'upload passe par l'endpoint interne (minio:9000) mais le navigateur doit
    # joindre MinIO via localhost:9000 — la signature S3 étant calculée hors-ligne,
    # on peut signer pour cet host public. En prod, identique à l'endpoint.
    S3_PUBLIC_ENDPOINT_URL = env("R2_PUBLIC_ENDPOINT_URL", default=env("R2_ENDPOINT_URL"))
    AWS_S3_SIGNATURE_VERSION = "s3v4"
    # Path-style + région : indispensables pour MinIO (et compatibles R2). Sans
    # path-style, boto3 vise un sous-domaine bucket.endpoint introuvable en dev.
    AWS_S3_ADDRESSING_STYLE = env("AWS_S3_ADDRESSING_STYLE", default="path")
    AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="us-east-1")
    AWS_DEFAULT_ACL = None
    AWS_QUERYSTRING_AUTH = True            # URL signées uniquement (CDC RG-17/19)
    AWS_QUERYSTRING_EXPIRE = 3600          # 1 heure

# --- Email (Brevo) ----------------------------------------------------------
# Envoi déclenché en asynchrone via Celery. SMTP par défaut ; l'API Brevo
# peut être utilisée dans apps/accounts/tasks.py pour de meilleurs logs.
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env("EMAIL_HOST", default="smtp-relay.brevo.com")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = env("BREVO_SMTP_USER", default="")
EMAIL_HOST_PASSWORD = env("BREVO_SMTP_KEY", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="no-reply@zola-ashe.com")
BREVO_API_KEY = env("BREVO_API_KEY", default="")

# --- Règles métier ZOLA ASHÉ (centralisées) ---------------------------------
OTP_TTL_MINUTES = 15            # CDC §3.3
OTP_MAX_ATTEMPTS = 3
LOGIN_MAX_ATTEMPTS = 5          # anti-brute-force (CDC §7.1)
LOGIN_LOCKOUT_MINUTES = 15
QUIZ_DEFAULT_THRESHOLD = 15     # seuil quiz /20 (CDC §4.4)
SUBSCRIPTION_DURATION_DAYS = 365
COTISATION_GRACE_DAYS = 30      # impayé > 30j → RESTREINT (RG-02, RG-03)

# --- Paiements Swinmo -------------------------------------------------------
# Doc : https://www.swinmo.shop/developers
SWINMO_WEBHOOK_SECRET = env("SWINMO_WEBHOOK_SECRET", default="")
SWINMO_SECRET_KEY = env("SWINMO_SECRET_KEY", default="")          # Bearer sk_live_...
SWINMO_API_URL = env("SWINMO_API_URL", default="https://www.swinmo.shop")
SWINMO_RETURN_URL = env("SWINMO_RETURN_URL", default="http://localhost:3000/paiement/succes")
SWINMO_CANCEL_URL = env("SWINMO_CANCEL_URL", default="http://localhost:3000/paiement/annule")

# Tarifs en FCFA (XAF, sans sous-unité) et identifiants produits Swinmo.
# Modèle du livret : droit d'inscription unique + cotisation mensuelle + don libre.
PRICE_INSCRIPTION = env.int("PRICE_INSCRIPTION", default=10000)   # 10 000 FCFA (≈ 20 € / 25 $)
PRICE_COTISATION = env.int("PRICE_COTISATION", default=2000)      # 2 000 FCFA / mois (minimum)
DON_MIN_AMOUNT = env.int("DON_MIN_AMOUNT", default=500)           # plancher d'un don volontaire

SWINMO_PRODUCT_INSCRIPTION = env("SWINMO_PRODUCT_INSCRIPTION", default="")
SWINMO_PRODUCT_COTISATION = env("SWINMO_PRODUCT_COTISATION", default="")
SWINMO_PRODUCT_DON = env("SWINMO_PRODUCT_DON", default="")

# --- Internationalisation ---------------------------------------------------
LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "UTC"               # cron à 00h00 UTC (CDC)
USE_I18N = True
USE_TZ = True

# --- Fichiers statiques & médias --------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# En prod, USE_S3=True → les médias vivent sur R2 (URLs signées). Le stockage
# local ci-dessous ne sert qu'au développement sans R2.
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
