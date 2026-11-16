# Cabinet Dentaire Ben Hamida

React 19, TypeScript, Vite, TanStack Start, Tailwind CSS et Supabase externe. TanStack Start est conservé : ce projet contient un serveur et n'est pas une SPA statique.

## Récupération dans VS Code

Installer Node.js 22 et Bun (livraison préparée avec Bun 1.4.4), puis :

```sh
git clone --branch develop https://github.com/MedAzizBenHamida/CabinetDentaire.git
cd CabinetDentaire
bun install --frozen-lockfile
```

**Avant de créer `.env`**, ajouter manuellement ces exclusions au `.gitignore` local et les versionner sur une branche de développement :

```gitignore
.env
.env.*
!.env.example
*.tsbuildinfo
.workspace/
.lovable/
```

Le `.gitignore` dans l'éditeur est géré par la plateforme ; il n'a pas été modifié. Le transfert exclut néanmoins explicitement tous les fichiers `.env` réels.

```sh
cp .env.example .env
```

Remplacer les valeurs fictives localement par les réglages du projet Supabase officiel. Ne jamais les partager ou les committer. Les clés serveur doivent rester hors du navigateur. Le client navigateur généré cible déjà le projet officiel avec une clé publique ; les valeurs `VITE_*` de l'exemple ne remplacent pas automatiquement ce fichier généré.

```sh
bun run dev
bun run test
bun run lint
bun run build
bun run preview
```

Vite affiche l'adresse et le port locaux. TypeScript strict est configuré dans `tsconfig.json` ; aucun script séparé `typecheck` n'est encore fourni. Les tests REST anonymes nécessitent les deux variables `CABINET_TEST_*`. Les tests de disponibilité sur dates expirées sont ignorés.

## Limites de cette livraison de développement

- Le paquet public `@lovable.dev/vite-tanstack-config` est encore nécessaire à la construction ; son remplacement par une configuration standard indépendante n'est pas réalisé. Aucun backend Lovable Cloud ajouté.
- Les outils d'aperçu Lovable reviennent au stockage navigateur normal hors éditeur ; les hooks de remontée d'erreurs sont facultatifs.
- Les fonctions `src/lib/*.functions.ts` s'exécutent côté serveur et vérifient les identités. La base impose les permissions et conflits. Aucune Edge Function n'est présente.
- La limitation des demandes publiques utilise `cf-connecting-ip`. En local, les demandes partagent le bucket de secours. Ne pas fabriquer cet en-tête pour la production ; adapter sa source fiable au runtime cible.
- Les tests connectés n'ont pas pu être vérifiés ici. Erreurs de formatage et avis de sécurité des dépendances sont détaillés dans `TRANSFER-READINESS.md`. Ce transfert n'est pas une certification de production.

## Base Supabase

Projet unique autorisé : `zthgemzkhyznkhpwrrhe`. Les migrations existantes dans `supabase/migrations/` sont livrées pour historique, pas exécutées par GitHub. Ne pas les rejouer sur la base officielle : elles y sont déjà appliquées. L'activation du premier SUPER_ADMIN est une opération ponctuelle, non un seed générique. Tout nouvel environnement nécessite une revue et une autorisation distincte. Aucun export de patients ou stockage de production inclus.

## Workflow Git et hébergement

Tester les livraisons sur `develop`. Créer `feature/...` ou `fix/...` depuis cette branche. Aucune poussée directe sur `main` : livraison stable par Pull Request après validation. `DEVELOPMENT-SETUP.md` et son historique sont conservés. Le transfert via API GitHub n'établit pas de synchronisation native Lovable.

Aucun projet Vercel créé. L'exécution locale nécessite les dépendances et des secrets serveur locaux. Le déploiement du TanStack actuel nécessite un runtime serveur compatible et une adaptation Nitro ; aucune configuration SPA `dist` n'est fournie.
