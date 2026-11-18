-- Datos base para pruebas locales de Plim Plim.
-- Correr DESPUÉS de "npx prisma db push":
--   mysql -u plimplim -pplimplim_local plimplim_music < prisma/local/02_seed_base.sql
--
-- Accesos (contraseña de ambos: plimplim123)
--   Admin   (/admin/login): admin@plimplim.local
--   Jugador (/login):       jugador@plimplim.local

SET NAMES utf8mb4;

INSERT INTO admin_users (name, email, password_hash, role, created_at, updated_at)
VALUES ('Admin Plim Plim', 'admin@plimplim.local', '$2a$12$WeNxU4nipdp.n5OYUUdfXuvqdmDSMxQ7XxOAeerNkHGov0ZxZDnHy', 'super', NOW(), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role);

INSERT INTO users (firstname, lastname, email, password_hash, is_active, created_at, updated_at)
VALUES ('Jugador', 'Plim Plim', 'jugador@plimplim.local', '$2a$12$WeNxU4nipdp.n5OYUUdfXuvqdmDSMxQ7XxOAeerNkHGov0ZxZDnHy', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE firstname = VALUES(firstname);

INSERT INTO decks (title, description, theme, label_song, label_artist, label_album, active, created_at, updated_at)
VALUES (
  'Plim Plim',
  'Las canciones de Plim Plim y sus amigos para cantar y adivinar en familia.',
  'Plim Plim',
  'Canción', 'Artista', 'Álbum',
  1, NOW(), NOW()
)
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- El jugador de prueba ya tiene el mazo activado
INSERT IGNORE INTO user_decks (user_id, deck_id, source, activated_at)
SELECT u.id, d.id, 'admin', NOW()
FROM users u JOIN decks d ON d.title = 'Plim Plim'
WHERE u.email = 'jugador@plimplim.local';
