-- Add the 16 collectible figurines to the shared NexaCoins inventory.
-- Run after 20261120_nexora_private_social.sql and 20261122_nexora_nexacoins.sql.
begin;

alter table public.store_items
  add column if not exists category text not null default 'frame';

alter table public.store_items
  drop constraint if exists store_items_category_check;
alter table public.store_items
  add constraint store_items_category_check
  check (category in ('frame','aura','effect','personalization','collectible'));

insert into public.store_items (slug, name, description, price, rarity, preview_style, category, active)
values
  ('figurita-01', 'Figurita 01', 'Una pieza para completar la colección NEXORA.', 30, 'common', 'basic', 'collectible', true),
  ('figurita-02', 'Figurita 02', 'Una pieza para completar la colección NEXORA.', 30, 'common', 'basic', 'collectible', true),
  ('figurita-03', 'Figurita 03', 'Una pieza para completar la colección NEXORA.', 30, 'common', 'basic', 'collectible', true),
  ('figurita-04', 'Figurita 04', 'Una pieza para completar la colección NEXORA.', 30, 'common', 'basic', 'collectible', true),
  ('figurita-05', 'Figurita 05', 'Una pieza para completar la colección NEXORA.', 30, 'common', 'basic', 'collectible', true),
  ('figurita-06', 'Figurita 06', 'Una pieza para completar la colección NEXORA.', 30, 'common', 'basic', 'collectible', true),
  ('figurita-07', 'Figurita 07', 'Una pieza para completar la colección NEXORA.', 30, 'common', 'basic', 'collectible', true),
  ('figurita-08', 'Figurita 08', 'Una pieza para completar la colección NEXORA.', 30, 'common', 'basic', 'collectible', true),
  ('figurita-09', 'Figurita 09', 'Una pieza para completar la colección NEXORA.', 30, 'common', 'basic', 'collectible', true),
  ('figurita-10', 'Figurita 10', 'Una pieza para completar la colección NEXORA.', 30, 'common', 'basic', 'collectible', true),
  ('figurita-11', 'Figurita 11', 'Una pieza para completar la colección NEXORA.', 30, 'common', 'basic', 'collectible', true),
  ('figurita-12', 'Figurita 12', 'Una pieza para completar la colección NEXORA.', 30, 'common', 'basic', 'collectible', true),
  ('figurita-13', 'Figurita 13', 'Una pieza para completar la colección NEXORA.', 30, 'common', 'basic', 'collectible', true),
  ('figurita-14', 'Figurita 14', 'Una pieza para completar la colección NEXORA.', 30, 'common', 'basic', 'collectible', true),
  ('figurita-15', 'Figurita 15', 'Una pieza para completar la colección NEXORA.', 30, 'common', 'basic', 'collectible', true),
  ('figurita-16', 'Figurita 16', 'Una pieza para completar la colección NEXORA.', 30, 'common', 'basic', 'collectible', true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  rarity = excluded.rarity,
  preview_style = excluded.preview_style,
  category = excluded.category,
  active = true,
  updated_at = now();

commit;
notify pgrst, 'reload schema';
