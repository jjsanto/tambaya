ALTER TABLE users ADD COLUMN gender TEXT NOT NULL DEFAULT 'UNSPECIFIED' CHECK (gender IN ('FEMALE','MALE','UNSPECIFIED'));

UPDATE users SET gender='FEMALE', avatar_type='PRESET', avatar_value='woman-mediterranean'
WHERE username IN ('sofia_martins','ines_costa','elena_rossi');
UPDATE users SET gender='FEMALE', avatar_type='PRESET', avatar_value='woman-african'
WHERE username IN ('amina_yusuf','leila_haddad');
UPDATE users SET gender='FEMALE', avatar_type='PRESET', avatar_value='woman-south-asian'
WHERE username='maya_patel';

UPDATE users SET gender='MALE', avatar_type='PRESET', avatar_value='man-east-asian'
WHERE username IN ('daniel_kim','marcus_lee');
UPDATE users SET gender='MALE', avatar_type='PRESET', avatar_value='man-european'
WHERE username IN ('lucas_moreau','noah_williams');
