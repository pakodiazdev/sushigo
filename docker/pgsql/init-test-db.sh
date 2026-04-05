#!/bin/bash
set -e

# Create auxiliary databases on first init.
# Main dev DB ($POSTGRES_DB, default: mydb) is created automatically by the postgres image.
#
# Database purpose map:
#   mydb_test    → PHPUnit Feature/Unit tests  (phpunit.xml DB_DATABASE)
#   mydb_e2e     → Cypress E2E tests           (docker-compose.e2e.yml POSTGRES_DB)
#   mydb_devtest → DevTest / Cypress-UI local   (cypress-ui container)
#
# Legacy names kept for backward compatibility:
#   sushigo_dev, sushigo_test, sushigo_e2e, sushigo_prod

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Active databases
    CREATE DATABASE mydb_test;
    GRANT ALL PRIVILEGES ON DATABASE mydb_test TO $POSTGRES_USER;

    CREATE DATABASE mydb_e2e;
    GRANT ALL PRIVILEGES ON DATABASE mydb_e2e TO $POSTGRES_USER;

    CREATE DATABASE mydb_devtest;
    GRANT ALL PRIVILEGES ON DATABASE mydb_devtest TO $POSTGRES_USER;

    -- Legacy databases (kept for backward compatibility)
    CREATE DATABASE sushigo_dev;
    GRANT ALL PRIVILEGES ON DATABASE sushigo_dev TO $POSTGRES_USER;

    CREATE DATABASE sushigo_test;
    GRANT ALL PRIVILEGES ON DATABASE sushigo_test TO $POSTGRES_USER;

    CREATE DATABASE sushigo_e2e;
    GRANT ALL PRIVILEGES ON DATABASE sushigo_e2e TO $POSTGRES_USER;

    CREATE DATABASE sushigo_prod;
    GRANT ALL PRIVILEGES ON DATABASE sushigo_prod TO $POSTGRES_USER;
EOSQL

echo "✅ PHPUnit test database 'mydb_test' created successfully"
echo "✅ E2E test database 'mydb_e2e' created successfully"
echo "✅ DevTest database 'mydb_devtest' created successfully"
echo "✅ Legacy databases (sushigo_*) created successfully"
