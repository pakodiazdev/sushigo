#!/bin/bash
set -e

# Create testing database
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE mydb_test;
    GRANT ALL PRIVILEGES ON DATABASE mydb_test TO admin;
EOSQL

echo "Testing database 'mydb_test' created successfully"
