# ZOLA ASHÉ — MVP 1

Plateforme communautaire, éducative et spirituelle : vitrine publique, espace
membre (contenus, formations, communauté) et back-office d'administration.

Ce dossier contient l'application complète, prête à démarrer en local avec
**Docker** en une seule commande.

---

## 1. Prérequis

- **Docker** et **Docker Compose** (Docker Desktop sur Mac/Windows, ou Docker
  Engine + plugin compose sur Linux).
- Aucune autre installation : tout (base de données, stockage, services) tourne
  dans des conteneurs.

Vérifier :

```bash
docker --version
docker compose version
```

---

## 2. Lancement (une commande)

Depuis le dossier `zola-ashe-infra` :

```bash
cd zola-ashe-infra
docker compose --env-file env/.env up --build
```

> Le premier démarrage construit les images (téléchargement + installation des
> dépendances) : cela peut prendre **quelques minutes**. Les démarrages suivants
> sont quasi instantanés.

Au démarrage, l'application prépare **automatiquement** :
- la base de données (migrations),
- le stockage des médias,
- des **données de démonstration** (un compte administrateur, un compte membre
  et un catalogue de contenus) pour pouvoir tester immédiatement.

Pour lancer en arrière-plan (sans bloquer le terminal), ajouter `-d` :

```bash
docker compose --env-file env/.env up --build -d
```

---

## 3. Accès

Une fois les services démarrés :

| Interface | Adresse |
|-----------|---------|
| **Site & espace membre** | http://localhost:3000 |
| **Back-office (admin)** | http://localhost:3010 |
| API | http://localhost:8010/api/ |

### Comptes de démonstration

| Rôle | Identifiant | Mot de passe |
|------|-------------|--------------|
| **Administrateur** | `admin@zola-ashe.com` | `Admin12345!` |
| **Membre** | `demo@zola-ashe.com` | `Demo12345!` |

> Astuce : pour tester le site **et** le back-office en même temps, ouvrez l'un
> des deux dans une fenêtre de navigation privée (la session est partagée sur
> `localhost`).

---

## 4. Arrêter

```bash
cd zola-ashe-infra
docker compose --env-file env/.env down
```

Pour repartir d'une base totalement vierge (réinitialise les données) :

```bash
docker compose --env-file env/.env down -v
```

---

## 5. Contenu du dossier

| Dossier | Rôle |
|---------|------|
| `zola-ashe-web` | Site public + espace membre |
| `zola-ashe-admin` | Back-office d'administration |
| `zola-ashe-backend` | API et logique métier |
| `zola-ashe-infra` | Orchestration Docker (à utiliser pour lancer) |

---

*ZOLA ASHÉ — MVP 1.*
# zolaashe
