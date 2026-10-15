-- contract: drops two RLS policies no code uses and narrows gift_claims updates to status. Found
-- by the Phase 2 review: membership and invite acceptance go only through SECURITY DEFINER
-- functions (create_family, accept_invite, join_family), so these policies only widened what a
-- future direct query could do: add yourself to any family, rewrite an invite, or move a claim to
-- another gift. No running code reads or writes through them (checked 2026-10-08).
DROP POLICY family_members_insert_self ON family_members;
--> statement-breakpoint
DROP POLICY family_invites_update_invitee ON family_invites;
--> statement-breakpoint
REVOKE INSERT ON family_members FROM app_user;
--> statement-breakpoint
REVOKE UPDATE ON family_invites FROM app_user;
--> statement-breakpoint
-- A claimer may change only the status (and its timestamp).
REVOKE UPDATE ON gift_claims FROM app_user;
--> statement-breakpoint
GRANT UPDATE (status, updated_at) ON gift_claims TO app_user;
