# Socle de données — Phase 2

## Livré sur le projet externe officiel

- Personnel : profils, comptes inactifs par défaut, rôles séparés ; gestion réservée au SUPER_ADMIN actif et protection du dernier SUPER_ADMIN dans l'opération applicative.
- Patients : identité, téléphone tunisien et naissance non future ; création/modification contrôlées et détection des doublons exacts. Un téléphone partagé n'est pas une identité unique.
- Recherche et consultation patients tracées, avec pagination.
- Ressource de soins V1 : un fauteuil/espace initial ; aucun praticien réel inventé.
- Horaires validés configurés : lundi à vendredi 08h–13h et 15h–17h ; samedi 08h–13h ; dimanche fermé. Sept soins et durées validés sont actifs ; fermetures exceptionnelles configurables.
- Agenda : rendez-vous et blocages dans une même table, exclusion PostgreSQL des chevauchements, intervalles consécutifs permis ; disponibilités en Africa/Tunis. Les horaires ne peuvent invalider un rendez-vous futur actif.
- Demandes : date et période uniquement, téléphone +216 suivi de huit chiffres, état initial PENDING, prévention des demandes identiques en attente ; confirmation atomique avec patient existant et rendez-vous. Une nouvelle fiche peut être créée avant confirmation.
- Disponibilité publique : uniquement les périodes compatibles avec les horaires, sans agenda, motifs ni identité patient.
- Notes : brouillons, création/modification par le personnel actif, finalisation seulement par un dentiste vérifié, versions immuables, protection contre les modifications concurrentes et consultations tracées.
- Audit confidentiel : références et opérations sans duplication du contenu médical, consultation paginée réservée au SUPER_ADMIN.

## Interfaces SQL

Les fonctions publiques protégées sont des wrappers SECURITY INVOKER. Leurs implémentations privées vérifient auth.uid(), le compte actif et les permissions. Les tables sensibles ne disposent pas de lecture directe navigateur.

Patients : `save_patient_record`, `search_patients`, `read_patient`.
Agenda : `save_agenda_entry`, `read_agenda`.
Demandes : `available_request_periods`, `read_appointment_requests`, `confirm_appointment_request`.
Notes : `save_medical_note`, `read_medical_notes`, `read_medical_note_history`.
Configuration : `save_care_service`, `save_opening_interval`, `save_exceptional_closure`, `remove_schedule_configuration`.
Personnel/audit : `manage_staff_account`, `read_cabinet_audit`.

`submit_appointment_request` reste réservé au service_role : le formulaire public passe par une action serveur étroite, validée et limitée à cinq tentatives par dix minutes avec compteurs PostgreSQL privés. La connexion est hachée avec HMAC, sans stockage d’adresse IP brute. Les autres opérations utilisent le client authentifié, pas le service_role.

## Vérifications

- Migration : tests PostgreSQL temporaires réussis puis annulés sans résidus : téléphone, naissance future, PENDING initial, doublon de demande, période matin, chevauchement de blocages, blocs consécutifs, refus de lecture/écriture médicale sans identité.
- Concurrence : contrainte d'exclusion PostgreSQL présente ; aucun test de charge à deux sessions exécuté.
- RLS : contrôle structurel et linter ; tests REST anonymes conservés dans le projet.
- Les tests unitaires ne prouvent pas les autorisations PostgreSQL.
- Interfaces livrées : connexion, patients, notes et historique, agenda jour/semaine/mois, demandes et confirmation, réglages, personnel et audit. Disponibilité publique et protection des pages sans session vérifiées ; aucun débordement mobile ni erreur runtime constaté.
- Parcours authentifiés et soumission publique complète : NON VÉRIFIÉS. Le projet externe ne dispose pas ici d'une session de personnel utilisable. Horaires et soins configurés et relus ; périodes publiques vérifiées dans le navigateur sans envoyer de fausse demande.

## Prérequis à fournir avant utilisation réelle

| Point | État | Responsable |
| --- | --- | --- |
| Premier compte SUPER_ADMIN confirmé et activé | Provisionné lors de l’étape précédente | Propriétaire du cabinet |
| Identité et habilitation professionnelle du dentiste | À vérifier dans professional_authorizations ; aucune attribution automatique par rôle | Responsable du cabinet |
| Horaires réels et durées des services | Validés, configurés et vérifiés | Dentiste / responsable du cabinet |
| Rejet, annulation de demande, absence et états cliniques supplémentaires | Non ajoutés : cycle de vie non validé | Responsable du cabinet |
| Conservation, corrections après finalisation et suppression réglementaire | Non automatisées : politique non validée | Responsable du cabinet |
| Vérifications authentifiées et concurrence à deux sessions | En attente d'un personnel de test autorisé | Responsable technique |
| Développement des écrans et connexion Supabase des actions | Livré, vérification authentifiée encore requise | Responsable technique |
| Livraison autonome et intégration au GitHub officiel existant | Intégration manuelle à organiser ; socle local toujours TanStack Start | Responsable technique / propriétaire du dépôt |

Aucun fournisseur SMS, hébergement Vercel, dépôt supplémentaire, donnée patient réelle ou automatisme de purge n'a été créé.