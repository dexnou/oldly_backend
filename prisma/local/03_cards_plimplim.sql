-- Cartas del mazo "Plim Plim" (canciones de Spotify).
-- Correr DESPUÉS de 02_seed_base.sql:
--   mysql -u plimplim -pplimplim_local plimplim_music < prisma/local/03_cards_plimplim.sql
-- Los qr_token son fijos: si recreás la base, los QR impresos siguen funcionando.

SET NAMES utf8mb4;

INSERT INTO artists (name, country, genre, created_at, updated_at)
VALUES ('El Payaso Plim Plim', 'Argentina', 'Infantil', NOW(), NOW())
ON DUPLICATE KEY UPDATE genre = VALUES(genre);
SET @artist_id = (SELECT id FROM artists WHERE name = 'El Payaso Plim Plim' AND country = 'Argentina');
SET @deck_id = (SELECT id FROM decks WHERE title = 'Plim Plim');

-- Álbumes
INSERT INTO albums (artist_id, title, release_year, cover_url, created_at, updated_at)
VALUES (@artist_id, 'Las Canciones de Plim Plim Vol. 2', 2018, 'https://image-cdn-ak.spotifycdn.com/image/ab67616d0000b273b525202de82c390cdddeef29', NOW(), NOW())
ON DUPLICATE KEY UPDATE cover_url = VALUES(cover_url);
INSERT INTO albums (artist_id, title, release_year, cover_url, created_at, updated_at)
VALUES (@artist_id, 'Las Canciones de Plim Plim Vol. 8', 2023, 'https://image-cdn-ak.spotifycdn.com/image/ab67616d0000b273597a026dffe8ae319c3ca18f', NOW(), NOW())
ON DUPLICATE KEY UPDATE cover_url = VALUES(cover_url);
INSERT INTO albums (artist_id, title, release_year, cover_url, created_at, updated_at)
VALUES (@artist_id, 'Las Canciones de Plim Plim Vol. 4', 2021, 'https://image-cdn-ak.spotifycdn.com/image/ab67616d0000b2730dcd0b07d09cb08001d6f771', NOW(), NOW())
ON DUPLICATE KEY UPDATE cover_url = VALUES(cover_url);
INSERT INTO albums (artist_id, title, release_year, cover_url, created_at, updated_at)
VALUES (@artist_id, 'Las Canciones de Plim Plim Vol. 3', 2020, 'https://image-cdn-ak.spotifycdn.com/image/ab67616d0000b273424ce8be91279322f9c383a7', NOW(), NOW())
ON DUPLICATE KEY UPDATE cover_url = VALUES(cover_url);
INSERT INTO albums (artist_id, title, release_year, cover_url, created_at, updated_at)
VALUES (@artist_id, 'Las Canciones de Plim Plim Vol. 1', 2018, 'https://image-cdn-ak.spotifycdn.com/image/ab67616d0000b273ac53fe8c6d028e6b8c68a0df', NOW(), NOW())
ON DUPLICATE KEY UPDATE cover_url = VALUES(cover_url);
INSERT INTO albums (artist_id, title, release_year, cover_url, created_at, updated_at)
VALUES (@artist_id, 'Las Canciones de Plim Plim Vol. 11', 2024, 'https://image-cdn-ak.spotifycdn.com/image/ab67616d0000b2739f39877ca3d160303ac9c8a3', NOW(), NOW())
ON DUPLICATE KEY UPDATE cover_url = VALUES(cover_url);

-- Cartas
INSERT INTO cards (deck_id, artist_id, album_id, song_name, qr_code, qr_token, preview_url, spotify_url, difficulty, created_at, updated_at)
SELECT @deck_id, @artist_id, al.id, 'La Lechuza', '{"token":"OndeQNjyIQ6caFlc","redirectUrl":"https://oldyfans.com.ar/play/OndeQNjyIQ6caFlc","cardId":null,"gameUrl":null}', 'OndeQNjyIQ6caFlc', 'https://p.scdn.co/mp3-preview/7cd7213ace392c55214785b958894f506919774e', 'https://open.spotify.com/track/0bcksSHb2zUw0TrIvb9yXU', 'easy', NOW(), NOW()
FROM albums al WHERE al.artist_id = @artist_id AND al.title = 'Las Canciones de Plim Plim Vol. 2' AND al.release_year = 2018
ON DUPLICATE KEY UPDATE spotify_url = VALUES(spotify_url), preview_url = VALUES(preview_url), album_id = VALUES(album_id);
INSERT INTO cards (deck_id, artist_id, album_id, song_name, qr_code, qr_token, preview_url, spotify_url, difficulty, created_at, updated_at)
SELECT @deck_id, @artist_id, al.id, 'Estrellita Donde Estás', '{"token":"A2XKRrnGPqQZ8KS2","redirectUrl":"https://oldyfans.com.ar/play/A2XKRrnGPqQZ8KS2","cardId":null,"gameUrl":null}', 'A2XKRrnGPqQZ8KS2', 'https://p.scdn.co/mp3-preview/74b53ba2ddf25a3c93e0d8606e835714f1cb2ed5', 'https://open.spotify.com/track/4I0E8caJ4o3Y6TjLc4m1aR', 'easy', NOW(), NOW()
FROM albums al WHERE al.artist_id = @artist_id AND al.title = 'Las Canciones de Plim Plim Vol. 2' AND al.release_year = 2018
ON DUPLICATE KEY UPDATE spotify_url = VALUES(spotify_url), preview_url = VALUES(preview_url), album_id = VALUES(album_id);
INSERT INTO cards (deck_id, artist_id, album_id, song_name, qr_code, qr_token, preview_url, spotify_url, difficulty, created_at, updated_at)
SELECT @deck_id, @artist_id, al.id, 'Abejita Chiquitita', '{"token":"Tz5fl8zIYvFnfeQ7","redirectUrl":"https://oldyfans.com.ar/play/Tz5fl8zIYvFnfeQ7","cardId":null,"gameUrl":null}', 'Tz5fl8zIYvFnfeQ7', 'https://p.scdn.co/mp3-preview/5a154000d795ad2ae6d4632cdfdb4117ae7d8379', 'https://open.spotify.com/track/70ygVDJv1Wou8WGD34K5An', 'easy', NOW(), NOW()
FROM albums al WHERE al.artist_id = @artist_id AND al.title = 'Las Canciones de Plim Plim Vol. 8' AND al.release_year = 2023
ON DUPLICATE KEY UPDATE spotify_url = VALUES(spotify_url), preview_url = VALUES(preview_url), album_id = VALUES(album_id);
INSERT INTO cards (deck_id, artist_id, album_id, song_name, qr_code, qr_token, preview_url, spotify_url, difficulty, created_at, updated_at)
SELECT @deck_id, @artist_id, al.id, 'A Ram Sam Sam', '{"token":"KRAjgNy2L7etWxfl","redirectUrl":"https://oldyfans.com.ar/play/KRAjgNy2L7etWxfl","cardId":null,"gameUrl":null}', 'KRAjgNy2L7etWxfl', 'https://p.scdn.co/mp3-preview/02b25f0a4d740943f36506339f9667a1229540ca', 'https://open.spotify.com/track/1y8lwkAri9bMTy6BWNIVB0', 'easy', NOW(), NOW()
FROM albums al WHERE al.artist_id = @artist_id AND al.title = 'Las Canciones de Plim Plim Vol. 4' AND al.release_year = 2021
ON DUPLICATE KEY UPDATE spotify_url = VALUES(spotify_url), preview_url = VALUES(preview_url), album_id = VALUES(album_id);
INSERT INTO cards (deck_id, artist_id, album_id, song_name, qr_code, qr_token, preview_url, spotify_url, difficulty, created_at, updated_at)
SELECT @deck_id, @artist_id, al.id, 'Como Los Animalitos', '{"token":"QsSRJVQJtGQWyZT9","redirectUrl":"https://oldyfans.com.ar/play/QsSRJVQJtGQWyZT9","cardId":null,"gameUrl":null}', 'QsSRJVQJtGQWyZT9', 'https://p.scdn.co/mp3-preview/04ae274dbd65c0919f65e821ffb9b6bf13f2ebec', 'https://open.spotify.com/track/6GEPowqFAnNGfBYr6GIHWs', 'easy', NOW(), NOW()
FROM albums al WHERE al.artist_id = @artist_id AND al.title = 'Las Canciones de Plim Plim Vol. 3' AND al.release_year = 2020
ON DUPLICATE KEY UPDATE spotify_url = VALUES(spotify_url), preview_url = VALUES(preview_url), album_id = VALUES(album_id);
INSERT INTO cards (deck_id, artist_id, album_id, song_name, qr_code, qr_token, preview_url, spotify_url, difficulty, created_at, updated_at)
SELECT @deck_id, @artist_id, al.id, 'A Dormir', '{"token":"LG37HINkTNR7Y88Q","redirectUrl":"https://oldyfans.com.ar/play/LG37HINkTNR7Y88Q","cardId":null,"gameUrl":null}', 'LG37HINkTNR7Y88Q', 'https://p.scdn.co/mp3-preview/dbb90f75c04e3bde2ed9b9b79e005365c36c33d3', 'https://open.spotify.com/track/148MY2Cu0rsSJQYWJTblgU', 'easy', NOW(), NOW()
FROM albums al WHERE al.artist_id = @artist_id AND al.title = 'Las Canciones de Plim Plim Vol. 1' AND al.release_year = 2018
ON DUPLICATE KEY UPDATE spotify_url = VALUES(spotify_url), preview_url = VALUES(preview_url), album_id = VALUES(album_id);
INSERT INTO cards (deck_id, artist_id, album_id, song_name, qr_code, qr_token, preview_url, spotify_url, difficulty, created_at, updated_at)
SELECT @deck_id, @artist_id, al.id, 'Qué Le Pasa Al Cerdito Enojón?', '{"token":"GbSX1EtCGYc7N5Ur","redirectUrl":"https://oldyfans.com.ar/play/GbSX1EtCGYc7N5Ur","cardId":null,"gameUrl":null}', 'GbSX1EtCGYc7N5Ur', 'https://p.scdn.co/mp3-preview/7eb01272b193809fc2f4015fd4f65ce94daf4517', 'https://open.spotify.com/track/26iuoJkdGMivRM3crWDlSw', 'easy', NOW(), NOW()
FROM albums al WHERE al.artist_id = @artist_id AND al.title = 'Las Canciones de Plim Plim Vol. 11' AND al.release_year = 2024
ON DUPLICATE KEY UPDATE spotify_url = VALUES(spotify_url), preview_url = VALUES(preview_url), album_id = VALUES(album_id);
INSERT INTO cards (deck_id, artist_id, album_id, song_name, qr_code, qr_token, preview_url, spotify_url, difficulty, created_at, updated_at)
SELECT @deck_id, @artist_id, al.id, 'Si Tú Tienes Muchas Ganas de Aplaudir', '{"token":"Z79l38H3pi0rI7c1","redirectUrl":"https://oldyfans.com.ar/play/Z79l38H3pi0rI7c1","cardId":null,"gameUrl":null}', 'Z79l38H3pi0rI7c1', 'https://p.scdn.co/mp3-preview/3ac1d379e4009672cd67f7811473ba8f4278a640', 'https://open.spotify.com/track/51ZgWukMc1G5DailAaRbNP', 'easy', NOW(), NOW()
FROM albums al WHERE al.artist_id = @artist_id AND al.title = 'Las Canciones de Plim Plim Vol. 2' AND al.release_year = 2018
ON DUPLICATE KEY UPDATE spotify_url = VALUES(spotify_url), preview_url = VALUES(preview_url), album_id = VALUES(album_id);
INSERT INTO cards (deck_id, artist_id, album_id, song_name, qr_code, qr_token, preview_url, spotify_url, difficulty, created_at, updated_at)
SELECT @deck_id, @artist_id, al.id, 'Cabeza, Hombro, Rodilla y Pie', '{"token":"kEnoe5K8XRKGTRIP","redirectUrl":"https://oldyfans.com.ar/play/kEnoe5K8XRKGTRIP","cardId":null,"gameUrl":null}', 'kEnoe5K8XRKGTRIP', 'https://p.scdn.co/mp3-preview/e2f077a24f7b3e75b37aba0d7eeed002fbe708a0', 'https://open.spotify.com/track/1V19RXI1yiRhvDAyjnnG6g', 'easy', NOW(), NOW()
FROM albums al WHERE al.artist_id = @artist_id AND al.title = 'Las Canciones de Plim Plim Vol. 4' AND al.release_year = 2021
ON DUPLICATE KEY UPDATE spotify_url = VALUES(spotify_url), preview_url = VALUES(preview_url), album_id = VALUES(album_id);
INSERT INTO cards (deck_id, artist_id, album_id, song_name, qr_code, qr_token, preview_url, spotify_url, difficulty, created_at, updated_at)
SELECT @deck_id, @artist_id, al.id, 'Las Ruedas del Autobús', '{"token":"gDCN2kxu7HwoCfs3","redirectUrl":"https://oldyfans.com.ar/play/gDCN2kxu7HwoCfs3","cardId":null,"gameUrl":null}', 'gDCN2kxu7HwoCfs3', 'https://p.scdn.co/mp3-preview/a907b6e0a909d8058d4967c6d22a6b8032c65c21', 'https://open.spotify.com/track/6SChrro6YE5f7qz07HuIbU', 'easy', NOW(), NOW()
FROM albums al WHERE al.artist_id = @artist_id AND al.title = 'Las Canciones de Plim Plim Vol. 2' AND al.release_year = 2018
ON DUPLICATE KEY UPDATE spotify_url = VALUES(spotify_url), preview_url = VALUES(preview_url), album_id = VALUES(album_id);
