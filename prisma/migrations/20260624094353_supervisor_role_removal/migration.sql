-- Stakeholder decision: system is now 3 roles (STAFF, ADMIN, MANAGER).
-- SUPERVISOR is folded into ADMIN, not deleted, because AuditLog.userId and
-- Purchase.userIdAdmin are non-cascading foreign keys to User -- deleting
-- a user who already created logs or double-checks would violate them.
UPDATE "Purchase" SET status_approval = 'menunggu_verifikasi' WHERE status_approval = 'menunggu_verifikasi_supervisor';
UPDATE "User" SET role = 'ADMIN' WHERE role = 'SUPERVISOR';
