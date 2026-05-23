"""Seed de démonstration ZOLA ASHÉ — données de consultation (idempotent).

Fidèle au livret : un admin, un membre démo (droit d'inscription réglé +
cotisation à jour → ACTIF), la bibliothèque (10 livres), les formations, un
contenu libre, des publications et des articles. Lancer :

    python manage.py seed_demo
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import Role, User, UserStatus
from apps.billing.models import (
    Payment,
    PaymentStatus,
    PaymentType,
    Subscription,
    SubscriptionType,
)
from apps.blog.models import Article
from apps.community.models import Audience, Post
from apps.content.models import Category, Collection, Content, ContentType

MEMBRE = ["MEMBRE"]  # accès réservé aux membres actifs
LIBRE: list[str] = []  # contenu en accès libre


def thumb(seed: str) -> str:
    return f"https://picsum.photos/seed/{seed}/480/300"


# Bibliothèque du membre (livret §11) — 10 ouvrages, en PDF.
LIVRES = [
    ("Comprendre la spiritualité", "Les fondements de la spiritualité et les principes qui influencent la vie.", "livre1"),
    ("Libère-toi", "Se libérer des blocages intérieurs et des limitations qui empêchent d'avancer.", "livre2"),
    ("Dominer mon année", "Préparer, organiser et diriger efficacement son année.", "livre3"),
    ("Le pouvoir spirituel de la femme", "La puissance intérieure de la femme et son rôle dans l'équilibre de la société.", "livre4"),
    ("Le secret ultime de la libation", "Les principes et la pratique de la libation, dans une approche consciente.", "livre5"),
    ("Le guide secret du déblocage spirituel", "Comprendre certains blocages invisibles et les moyens de les dépasser.", "livre6"),
    ("Le pouvoir de la gratitude", "Comment la gratitude transforme l'état d'esprit et attire la bénédiction.", "livre7"),
    ("Le principe de la bénédiction universelle", "Comment actes et intentions favorisent la circulation de la bénédiction.", "livre8"),
    ("L'Afrique, notre identité", "La redécouverte de l'identité africaine et de ses racines.", "livre9"),
    ("Comprendre les cycles lunaires et leurs rituels", "L'influence des cycles lunaires et leur usage conscient.", "livre10"),
]

# Formations (livret §12) — en vidéo. La dernière est le programme phare.
FORMATIONS = [
    ("07 jours pour comprendre et pratiquer sainement la libation", "Les fondements de la libation, pratiquée de manière équilibrée.", "form1"),
    ("Les mystères de la terre", "La relation entre l'être humain, la nature et les principes énergétiques de la terre.", "form2"),
    ("Le secret des rituels spirituels", "Le rôle des rituels et leur place dans le développement spirituel.", "form3"),
    ("Les clés spirituelles d'un succès durable", "Les principes pour construire une vie stable et équilibrée.", "form4"),
    ("Les secrets de la loi d'attraction", "Les mécanismes de l'attraction, l'importance des pensées et des intentions.", "form5"),
    ("Programme — Préparer, posséder et dominer une année (22 modules)", "Le programme phare pour structurer ses objectifs et diriger son année.", "form6"),
]

POSTS = [
    "Bienvenue dans la communauté ZOLA ASHÉ 🌍 Que l'amour que nous portons devienne une force de transformation.",
    "Séance hebdomadaire ce vendredi de 20h à 22h (GMT+1). On vous attend nombreux !",
    "Nouvelle formation du mois en ligne : pensez à l'ajouter à votre parcours.",
    "Rappel : le coaching privé de 30 min avec le fondateur est offert à chaque nouveau membre.",
]

ARTICLES = [
    ("Comprendre l'Ashé : la force qui anime toute chose", "Spiritualité",
     "Aux racines de la tradition, l'Ashé désigne l'énergie vitale présente en chacun de nous.",
     "blog1",
     "L'Ashé est ce souffle qui relie l'humain au vivant.\n\nDans la tradition, cultiver son Ashé, "
     "c'est aligner ses actes, ses paroles et son intention.\n\nCe premier article vous invite à un "
     "voyage intérieur, à la rencontre de cette force qui éveille votre parcours."),
    ("Le retour aux sources : retrouver son identité", "Identité",
     "Se reconnecter à son héritage et à la sagesse de nos ancêtres méritants pour avancer en conscience.",
     "blog2",
     "Beaucoup vivent coupés de leurs racines.\n\nLe retour aux sources n'est pas une nostalgie : c'est "
     "une force.\n\nComprendre d'où l'on vient éclaire le chemin que l'on choisit."),
    ("La discipline, socle de la transformation", "Développement",
     "La transformation exige constance et rigueur : structurer sa vie pour progresser durablement.",
     "blog3",
     "La discipline n'enferme pas, elle libère.\n\nElle donne un cadre à l'intention et transforme les "
     "résolutions en habitudes.\n\nVoici comment l'installer pas à pas."),
    ("Pourquoi un parcours progressif change tout", "Pédagogie",
     "Avancer étape par étape, valider ses acquis : la clé d'un apprentissage qui s'ancre durablement.",
     "blog4",
     "Le déverrouillage progressif n'est pas une contrainte, c'est un rythme.\n\nIl respecte votre "
     "cheminement et consolide chaque acquis avant le suivant."),
]


class Command(BaseCommand):
    help = "Crée des données de démonstration pour la consultation."

    def handle(self, *args, **options):
        today = timezone.now().date()

        # --- Admin ---
        admin, _ = User.objects.get_or_create(
            email="admin@zola-ashe.com",
            defaults={"full_name": "Coach Rodrigue DOUANLA", "role": Role.ADMIN},
        )
        admin.role = Role.ADMIN
        admin.full_name = "Coach Rodrigue DOUANLA"
        admin.email_verified = True
        admin.is_staff = True
        admin.status = UserStatus.ACTIF
        admin.set_password("Admin12345!")
        admin.save()

        # --- Membre démo : inscription réglée + cotisation à jour → ACTIF ---
        demo, _ = User.objects.get_or_create(
            email="demo@zola-ashe.com",
            defaults={"full_name": "Membre Démo", "role": Role.MEMBER},
        )
        demo.full_name = "Membre Démo"
        demo.email_verified = True
        demo.status = UserStatus.ACTIF
        demo.set_password("Demo12345!")
        demo.save()

        # Adhésion propre et déterministe (on repart de zéro pour la démo).
        Payment.objects.filter(user=demo).delete()
        Subscription.objects.filter(user=demo).delete()
        sub = Subscription.objects.create(user=demo, type=SubscriptionType.MEMBRE,
                                          start=today, end=None, active=True)
        Payment.objects.create(user=demo, subscription=sub, type=PaymentType.INSCRIPTION,
                               status=PaymentStatus.VALIDE, amount=10000, reason="Seed démo")
        Payment.objects.create(user=demo, type=PaymentType.COTISATION,
                               status=PaymentStatus.VALIDE, amount=2000, reason="Seed démo")

        # --- Collections ---
        biblio, _ = Collection.objects.get_or_create(
            title="Bibliothèque ZOLA ASHÉ", content_type=ContentType.PDF,
            defaults={"category": Category.LIVRE, "order": 1,
                      "description": "Les ouvrages remis aux membres dès leur intégration."},
        )
        formations, _ = Collection.objects.get_or_create(
            title="Formations", content_type=ContentType.VIDEO,
            defaults={"category": Category.FORMATION, "order": 2,
                      "description": "Le parcours de formation, enrichi chaque mois."},
        )
        Collection.objects.filter(id=biblio.id).update(category=Category.LIVRE)
        Collection.objects.filter(id=formations.id).update(category=Category.FORMATION)

        # --- Contenus : libre + livres + formations ---
        # (type, titre, catégorie, accès, description, seed_image, collection)
        catalogue = [
            ("AUDIO", "Méditation guidée du matin", Category.LIBRE, LIBRE,
             "Une séance audio en accès libre pour bien commencer la journée.", "libre1", None),
        ]
        catalogue += [("PDF", t, Category.LIVRE, MEMBRE, d, s, biblio) for (t, d, s) in LIVRES]
        catalogue += [("VIDEO", t, Category.FORMATION, MEMBRE, d, s, formations) for (t, d, s) in FORMATIONS]

        created = 0
        for i, (ctype, title, category, access, desc, seed, col) in enumerate(catalogue, start=1):
            obj, was_created = Content.objects.get_or_create(
                title=title,
                defaults={
                    "content_type": ctype, "category": category, "description": desc,
                    "order": i, "active": True, "thumbnail_url": thumb(seed),
                    "access_subscription_types": access, "quiz_active": False,
                    "collection": col,
                },
            )
            if not was_created:
                obj.content_type = ctype
                obj.category = category
                obj.thumbnail_url = thumb(seed)
                obj.access_subscription_types = access
                obj.description = desc
                obj.collection = col
                obj.active = True
                obj.save()
            created += int(was_created)

        # --- Communauté (audience unique : TOUS) ---
        for text in POSTS:
            Post.objects.get_or_create(
                author=admin, text=text, audience=Audience.TOUS,
                defaults={"active": True},
            )

        # --- Blog / Journal ---
        for title, cat, excerpt, seed, body in ARTICLES:
            art, _ = Article.objects.get_or_create(
                title=title,
                defaults={"excerpt": excerpt, "body": body, "category": cat,
                          "cover_url": f"https://picsum.photos/seed/{seed}/800/450",
                          "author": admin, "published": True},
            )
            if not art.published:
                art.published = True
                art.save()

        self.stdout.write(self.style.SUCCESS(
            f"Seed OK — admin admin@zola-ashe.com / Admin12345!, "
            f"membre demo@zola-ashe.com / Demo12345!, "
            f"{Content.objects.count()} contenus, {Post.objects.count()} posts, "
            f"{Article.objects.count()} articles."
        ))
