-- DROP TABLE IF EXISTS locations;

-- CREATE TABLE locations (
--     id SERIAL PRIMARY KEY,
--     latitude NUMERIC,
--     longitude NUMERIC
-- );



DROP TABLE IF EXISTS location;

CREATE TABLE location
(
    id SERIAL PRIMARY KEY,
    latitude VARCHAR(255),
    longitude VARCHAR(255)
);