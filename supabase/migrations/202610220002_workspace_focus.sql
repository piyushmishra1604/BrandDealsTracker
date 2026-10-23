begin;

-- Lets an agency pick what the manager portal shows them: brand campaigns, their own
-- managed-creator roster, or both. Defaults to 'full' so existing workspaces don't change.
alter table public.workspaces add column focus text not null default 'full'
  check (focus in ('full', 'campaigns', 'talent'));

commit;
