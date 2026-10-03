-- Advisor: function_search_path_mutable. safe_timestamptz only casts text to timestamptz (a pg_catalog type), so an
-- empty search_path changes nothing it does and closes the mutable-path warning.
alter function public.safe_timestamptz(text) set search_path = '';
