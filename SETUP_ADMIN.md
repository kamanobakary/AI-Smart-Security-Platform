# Configuration de l'Administrateur

## Créer le compte administrateur Abou Kamano

Pour initialiser le compte administrateur dans Supabase, exécutez cette commande SQL dans la console Supabase:

```sql
-- Créer l'utilisateur dans auth.users
INSERT INTO auth.users (
  id,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  is_sso_user,
  confirmed_at,
  created_at,
  updated_at,
  last_sign_in_at
)
VALUES (
  gen_random_uuid(),
  'admin@aisecurity.io',
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Abou Kamano","role":"admin"}',
  false,
  NOW(),
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT(email) DO NOTHING
RETURNING id;
```

Ou utilisez l'interface d'administration Supabase pour créer le compte:

1. Allez dans **Authentication** > **Users**
2. Cliquez sur **Add user**
3. Remplissez:
   - Email: `admin@aisecurity.io`
   - Password: `demo123456` (ou générez un mot de passe fort)
   - Auto-confirm: Cochez cette option
   - User Metadata: 
     ```json
     {
       "full_name": "Abou Kamano",
       "role": "admin"
     }
     ```
4. Cliquez sur **Create user**

Le profil sera automatiquement créé via la fonction trigger.

## Informations d'accès

**Administrateur:**
- Email: `admin@aisecurity.io`
- Mot de passe: `demo123456`
- Rôle: Administrateur
- Département: Sécurité

## Affichage

- Le composant UserManagement affiche les vrais utilisateurs depuis la base de données Supabase
- Les noms sont affichés réellement sans données fictives
- Les emails sont masqués par défaut et remplacés par des identifiants UUID tronqués
- Seuls les utilisateurs enregistrés dans Supabase apparaissent
- Le design reste professionnel avec thème sombre et accents bleu/cyan

## Gestion des utilisateurs

Depuis l'interface:
- Voir tous les utilisateurs actifs
- Changer les rôles (Administrateur, Analyste, Utilisateur)
- Activer/désactiver les comptes
- Consulter les informations de dernière connexion
- Voir les détails complets dans le panneau latéral
