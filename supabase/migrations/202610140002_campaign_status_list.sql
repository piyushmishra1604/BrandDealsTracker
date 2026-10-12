begin;

-- Campaign statuses: Draft → Created → Active → Pending → Completed.
-- Existing rows move to the closest new status: paused becomes active, archived becomes completed.
update public.campaigns set status = 'active' where status = 'paused';
update public.campaigns set status = 'completed' where status = 'archived';

alter table public.campaigns drop constraint if exists campaigns_status_check;
alter table public.campaigns add constraint campaigns_status_check
  check (status in ('draft', 'created', 'active', 'pending', 'completed'));

commit;
