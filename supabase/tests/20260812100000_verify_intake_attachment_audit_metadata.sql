do $$
declare
  required_column text;
begin
  foreach required_column in array array['sha256_hex', 'source_channel', 'source_message_id', 'validation_status']
  loop
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'intake_report_attachments'
        and column_name = required_column
    ) then
      raise exception 'intake_report_attachments.% is missing', required_column;
    end if;
  end loop;
end;
$$;
