#!/bin/bash
set -e

# Create testing database
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE sushigo_dev;
    GRANT ALL PRIVILEGES ON DATABASE sushigo_dev TO admin;

    CREATE DATABASE sushigo_test;
    GRANT ALL PRIVILEGES ON DATABASE sushigo_test TO admin;

    CREATE DATABASE sushigo_e2e;
    GRANT ALL PRIVILEGES ON DATABASE sushigo_e2e TO admin;

    CREATE DATABASE mydb_devtest;
    GRANT ALL PRIVILEGES ON DATABASE mydb_devtest TO admin;
EOSQL

echo "Testing database 'sushigo_test' created successfully"
echo "E2E UI database 'sushigo_e2e' created successfully"
echo "DevTest database 'mydb_devtest' created successfully"
