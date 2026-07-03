-- Add free-text teacher_name to supervision_records so supervisors can record
-- the teacher without requiring a matched teachers table row.
alter table supervision_records add column if not exists teacher_name text;
