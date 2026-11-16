# Audit avant transfert vers develop

État : préparation uniquement, aucun transfert applicatif effectué. Destination exclusive : `MedAzizBenHamida/CabinetDentaire`, branche `develop`. Ne pas écrire sur `main`.

## Inventaire

Le manifeste `TRANSFER-MANIFEST.json` décrit 154 fichiers candidats (1 205 601 octets), leurs tailles et empreintes SHA-256, avant ajout de ces documents. Il ne constitue pas un paquet approuvé pour publication. Les documents de préparation seront ajoutés au manifeste définitif après revue.

- 118 fichiers dans `src` : 16 fichiers de routes (dont deux layouts), écrans publics, personnel, patients, agenda, demandes, notes, réglages, audit, composants UI, fonctions serveur et tests.
- 2 fichiers publics : favicon et robots.
- 19 fichiers Supabase : configuration et 18 migrations SQL ; aucune Edge Function dans le projet actuel.
- 15 fichiers racine : dépendances, verrouillage, configurations et documentation.
- Images locales : logo dent et photographie illustrative, aucune image de patient identifiée.

## Versions réellement installées

| Outil | Version |
| --- | --- |
| React / React DOM | 19.2.8 |
| Vite | 8.1.5 |
| TypeScript | 5.9.3 |
| TanStack Start | 1.168.60 |
| Supabase JS | 2.119.0 |
| Tailwind plugin Vite | 4.3.3 |
| Vitest | 4.1.11 |

Les plages de versions déclarées peuvent différer des versions résolues : conserver `bun.lock`. `dev`, `build`, `preview`, `lint`, `test` sont présents ; aucun script `typecheck` dédié. TypeScript est configuré en mode strict, sans émission.

Configurations : `package.json`, `bun.lock`, `bunfig.toml`, `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `components.json`, `.gitignore`, `supabase/config.toml`. Aucun `.env.example`, workflow CI ou `vercel.json` constaté.

## Supabase externe et dépendances Lovable

- Configuration navigateur, identifiant Supabase et URL serveur présents correspondent au projet officiel `zthgemzkhyznkhpwrrhe`.
- Variables serveur Supabase requises présentes dans le processus : URL, clé publique et clé privilégiée. Valeurs non reproduites.
- Le navigateur contient une clé **publique** Supabase, pas une clé privilégiée ; elle ne remplace pas RLS.
- Aucun backend Lovable Cloud, client d'authentification Lovable ou appel de passerelle Lovable identifié dans le code applicatif inspecté. Les secrets gérés de plateforme ne sont pas appelés par ces sources.
- Une dépendance Lovable de construction reste réelle : `@lovable.dev/vite-tanstack-config` est importée dans Vite. L'indépendance totale n'est donc pas acquise.
- Le stockage de session spécial à l'aperçu utilise `localStorage` hors éditeur. Les hooks de signalement d'erreurs Lovable sont facultatifs mais présents.
- Un message généré suggère Lovable Cloud en cas de configuration manquante : ce texte ne constitue pas une activation Cloud.
- TanStack Start et Nitro exécutent actuellement les fonctions serveur. Ce code n'est pas une SPA frontend-only déployable par simple publication de `dist`.
- La soumission publique lit un en-tête Cloudflare pour la limitation des tentatives : adapter ce point au runtime cible, sans accepter un en-tête arbitraire fourni par le client.

## Contrôles exécutés

- Suite locale : 52 tests réussis, 33 ignorés ; 30 ignorés nécessitaient la configuration des tests Supabase, trois fixtures de disponibilité sont désormais expirées.
- Exécution séparée avec configuration publique officielle : 30 tests de refus d'accès anonyme réussis. Aucun parcours personnel authentifié vérifié.
- Lint : 1 374 erreurs de formatage Prettier et six avertissements ; pas de correction automatique appliquée.
- Scan dépendances : 12 lignes d'avis (six élevées, six modérées), avec répétitions par dépendance parente. Paquets impliqués : Zod, js-yaml, source-map-js et Seroval. Une mise à jour compatible et des tests sont nécessaires ; ne pas migrer aveuglément Zod 3 vers 4.
- Aucun build/typecheck manuel lancé : l'audit ne prétend pas constituer une nouvelle certification de compilation autonome hors Lovable.
- Scan de signatures de clés privées et comparaison exacte aux secrets privilégiés du processus : aucune correspondance dans les 154 sources candidates. Pas de lecture/export de `.env`.
- Les UUID signalés appartiennent aux fixtures, ressources et noms de migrations ; le seul e-mail littéral détecté est un exemple de saisie. Aucune donnée patient réelle identifiée par ce contrôle, qui n'est pas une preuve exhaustive d'absence.

## Points à résoudre avant transfert complet

| Point | État | Responsable |
| --- | --- | --- |
| Liste et empreintes des sources | Préparées | Lovable / responsable technique |
| `.env` exclu du paquet | Oui, explicitement dans le manifeste | Responsable technique |
| Protection `.gitignore` | Insuffisante : `.env` non explicitement ignoré | Responsable technique |
| Modèle fictif `.env.example` et documentation locale | À préparer | Responsable technique |
| Qualité et dépendances vulnérables | À corriger ou accepter explicitement pour branche de développement ; pas prêt production | Responsable technique / propriétaire |
| Revue des migrations | Obligatoire avant rejeu | Responsable Supabase |
| Migration d'activation du premier SUPER_ADMIN | Ne pas rejouer automatiquement : opération ponctuelle approuvée pour un compte unique | Propriétaire / responsable Supabase |
| Tests authentifiés | Non disponibles ici pour Supabase externe non géré | Responsable technique autorisé |
| Suppression des dépendances de construction Lovable | À traiter dans l'adaptation autonome | Responsable technique |
| Transfert complet | Non effectué | Lovable après revue des fichiers et feu vert |

## Procédure de transfert préparée

1. Revoir la liste, exclure tout secret et donnée réelle ; conserver les migrations historiques sans les appliquer.
2. Corriger les exclusions, préparer le modèle fictif et documenter les limites connues.
3. Régénérer et vérifier le manifeste définitif après les modifications.
4. Relire la tête de `develop` et son contenu avant toute écriture ; préserver `DEVELOPMENT-SETUP.md` et tout ajout concurrent.
5. Ajouter les sources inspectées dans un commit descriptif dont le parent est la tête relue ; avancer uniquement `refs/heads/develop`, sans forcer.
6. Vérifier le commit, l'arbre et les empreintes en lecture GitHub. Aucune écriture sur `main`, aucun nouveau dépôt, aucune modification Supabase/Vercel.
7. Récupérer `develop` dans VS Code pour validation locale ; la future intégration en production passe par une Pull Request.

La méthode est un transfert contrôlé via GitHub API, pas une connexion native de synchronisation Lovable.