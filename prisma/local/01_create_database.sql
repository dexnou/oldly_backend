-- Base local para probar con canciones de Plim Plim.
-- Correr como root: mysql -u root -p < prisma/local/01_create_database.sql
-- Después, las tablas se crean con: npx prisma db push

CREATE DATABASE IF NOT EXISTS plimplim_music
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'plimplim'@'localhost' IDENTIFIED BY 'plimplim_local';
GRANT ALL PRIVILEGES ON plimplim_music.* TO 'plimplim'@'localhost';
-- Prisma necesita poder crear una base "shadow" temporal si se usan migraciones
GRANT CREATE, ALTER, DROP, REFERENCES ON *.* TO 'plimplim'@'localhost';
FLUSH PRIVILEGES;
