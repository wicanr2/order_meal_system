-- The order serial trigger must see all orders for the same ordering day.
-- Without SECURITY DEFINER, RLS limits regular users to their own rows, so
-- different users can receive the same order_sequence and hit the unique index.
create or replace function public.assign_order_serial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_sequence integer;
begin
  if new.created_at is null then
    new.created_at := now();
  end if;

  if new.order_sequence is null then
    perform pg_advisory_xact_lock(hashtext('orders:' || ((new.created_at at time zone 'Asia/Taipei')::date)::text));

    select coalesce(max(order_sequence), 0) + 1
      into next_sequence
      from public.orders
      where (created_at at time zone 'Asia/Taipei')::date = (new.created_at at time zone 'Asia/Taipei')::date;

    new.order_sequence := next_sequence;
  end if;

  if new.order_serial is null then
    new.order_serial := to_char(new.created_at at time zone 'Asia/Taipei', 'YYYYMMDDHH24MISS')
      || '-' || lpad(new.order_sequence::text, 4, '0');
  end if;

  return new;
end;
$$;
