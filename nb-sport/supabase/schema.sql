-- NB SPORT — schema Supabase
-- À exécuter dans l'éditeur SQL du projet Supabase dédié à NB SPORT.

create table if not exists categories (
  id text primary key,
  nom text not null,
  slug text not null unique,
  icone text not null default 'Dumbbell'
);

create table if not exists products (
  id text primary key,
  nom text not null,
  slug text not null unique,
  categorie_id text not null references categories(id) on delete cascade,
  description text not null default '',
  prix numeric not null default 0,
  prix_promo numeric,
  stock integer not null default 0,
  tailles text[] not null default '{}',
  couleurs text[] not null default '{}',
  images text[] not null default '{}',
  statut text not null default 'publie' check (statut in ('publie', 'masque')),
  nouveau boolean not null default false,
  note numeric not null default 0,
  avis integer not null default 0,
  cree_le timestamptz not null default now()
);

create table if not exists orders (
  id text primary key,
  numero text not null unique,
  client_nom text not null,
  client_telephone text not null,
  client_email text,
  adresse text not null,
  wilaya text not null,
  articles jsonb not null default '[]',
  montant numeric not null default 0,
  methode_paiement text not null default 'paiement_livraison' check (methode_paiement in ('paiement_livraison', 'carte')),
  statut text not null default 'nouvelle' check (statut in ('nouvelle', 'preparation', 'expediee', 'livree', 'annulee')),
  cree_le timestamptz not null default now(),
  livraison jsonb
);

create table if not exists customers (
  id text primary key,
  nom text not null,
  email text,
  telephone text not null,
  wilaya text not null,
  commandes integer not null default 0,
  total_depense numeric not null default 0,
  cree_le timestamptz not null default now()
);

create table if not exists promotions (
  id text primary key,
  titre text not null,
  description text not null default '',
  pourcentage integer not null default 0,
  actif boolean not null default true,
  date_debut timestamptz not null default now(),
  date_fin timestamptz not null default now()
);

alter table categories enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table customers enable row level security;
alter table promotions enable row level security;

-- Lecture publique du catalogue (boutique). Les écritures passent uniquement
-- par les routes API serveur, authentifiées avec la clé service_role
-- (qui contourne la RLS), jamais depuis le navigateur.
create policy "Lecture publique catégories" on categories for select using (true);
create policy "Lecture publique produits" on products for select using (true);
