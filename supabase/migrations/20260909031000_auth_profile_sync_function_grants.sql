-- Trigger-only privileged auth sync functions must not be directly executable by API roles.
revoke execute on function private.handle_new_auth_user() from public;
revoke execute on function private.handle_new_auth_user() from anon;
revoke execute on function private.handle_new_auth_user() from authenticated;

revoke execute on function private.handle_auth_user_email_update() from public;
revoke execute on function private.handle_auth_user_email_update() from anon;
revoke execute on function private.handle_auth_user_email_update() from authenticated;
