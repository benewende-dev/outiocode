<h1 align="center">OutioCode</h1>

<p align="center">L'agent de code agentique, branché sur Outio.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/outio"><img alt="npm" src="https://img.shields.io/npm/v/outio?style=flat-square" /></a>
  <a href="https://github.com/benewende-dev/outiocode/actions/workflows/outio-release.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/benewende-dev/outiocode/outio-release.yml?style=flat-square&branch=dev" /></a>
</p>

---

OutioCode est un éditeur agentique en terminal : le **provider Outio** et le catalogue de modèles sont **déjà intégrés au binaire**. Tu poses ta clé `outio_sk_…`, tu lances `outio`, et chaque session débite tes crédits Outio.

### Installation

```bash
npm i -g outio        # ou bun/pnpm/yarn
```

> Le provider Outio et les modèles sont intégrés — rien d'autre à configurer.

### Connexion

Génère une clé API depuis ton tableau de bord Outio (**Atelier Pro → OutioCode IDE**), puis expose-la dans ton environnement :

```bash
export OUTIO_API_KEY="outio_sk_xxxxxxxxxxxxxxxxxxxx"
```

OutioCode la lit automatiquement. La base API par défaut est `https://outio.app/api/v1` ; pour une instance auto-hébergée, surcharge-la avec `OUTIO_API_BASE`.

> L'accès à l'API programmatique d'Outio (consommée par OutioCode) est inclus dans le forfait **Business**.

### Lancer

```bash
outio
```

Dans n'importe quel projet. Bascule vers n'importe quel modèle Outio à la volée ; le budget crédits régule l'usage (1–3 crédits par message selon le modèle).

### Agents

OutioCode inclut deux agents intégrés, basculables avec la touche `Tab` :

- **build** — agent par défaut, accès complet pour le développement.
- **plan** — agent en lecture seule pour l'analyse et l'exploration de code (refuse les éditions de fichiers, demande permission avant d'exécuter des commandes).

Un sous-agent **general** est aussi disponible pour les recherches complexes et les tâches multi-étapes (`@general` dans un message).

### Publication

Les releases sont automatisées via GitHub Actions (`outio-release.yml`) : build des binaires multi-plateformes + publication sur npm. Déclenchement manuel depuis l'onglet **Actions → release**.

---

OutioCode est un fork rebrandé d'[opencode](https://github.com/anomalyco/opencode), adapté pour l'écosystème Outio. Il n'est pas développé par l'équipe OpenCode et n'y est pas affilié.
