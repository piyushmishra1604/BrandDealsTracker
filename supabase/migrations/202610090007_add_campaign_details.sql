-- Adds the fields the campaign detail redesign needs: a short category, a one-line
-- hero description, and a longer freeform notes field (matches creators.notes).
begin;

alter table public.campaigns
  add column if not exists category text check (category is null or char_length(category) <= 120),
  add column if not exists description text check (description is null or char_length(description) <= 500),
  add column if not exists notes text check (notes is null or char_length(notes) <= 5000);

commit;
