-- Migration 0002: Add email column to boards
ALTER TABLE boards ADD COLUMN email TEXT;
