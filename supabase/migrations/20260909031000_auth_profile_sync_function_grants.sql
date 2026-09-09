-- security-definer: reviewed
-- Trigger-only SECURITY DEFINER functions must not be directly executable by API roles.
revoke execute on function private.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function private.handle_auth_user_email_update() from public, anon, authenticated;
