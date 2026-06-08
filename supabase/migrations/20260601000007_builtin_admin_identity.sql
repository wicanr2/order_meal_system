-- Keep the documented admin login (`admin` + `系統管理員`) privileged even if
-- it was auto-created before this fix.
update public.profiles
set is_admin = true,
    active = true,
    updated_at = now()
where emp_id = 'admin'
  and name = '系統管理員';
