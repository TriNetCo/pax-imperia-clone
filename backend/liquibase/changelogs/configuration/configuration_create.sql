CREATE SCHEMA pax;

-- CREATE USER rpm_owner WITH PASSWORD 'pewpew';
-- GRANT ALL ON DATABASE dbmodels TO rpm_owner;

-- CREATE USER app_rpm WITH PASSWORD 'ez';
GRANT CONNECT ON DATABASE dbmodels TO app_rpm;

GRANT USAGE ON SCHEMA pax TO app_rpm;
GRANT SELECT, UPDATE, DELETE, INSERT ON ALL TABLES IN SCHEMA pax TO app_rpm;
-- ALTER DEFAULT PRIVILEGES FOR USER rpm_owner IN SCHEMA pax GRANT SELECT, UPDATE, DELETE, INSERT ON TABLES TO app_rpm;
-- ALTER DEFAULT PRIVILEGES FOR USER rpm_owner IN SCHEMA pax GRANT EXECUTE ON FUNCTIONS TO app_rpm;
