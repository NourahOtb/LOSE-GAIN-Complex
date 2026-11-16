-- Role helper functions are only needed by signed-in users (inside security rules).
revoke execute on function public.current_app_role(), public.is_staff(), public.is_coach_or_staff() from public, anon;
grant execute on function public.current_app_role(), public.is_staff(), public.is_coach_or_staff() to authenticated;
-- Note: the remaining "signed-in users can execute SECURITY DEFINER" advisor warnings are intentional:
-- mark_paid, cancel_class, add_stripe, set_level and add_coach_note each check the caller's role first.
