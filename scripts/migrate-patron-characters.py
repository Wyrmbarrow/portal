#!/usr/bin/env python3
"""
Run the portal_patron_characters migration on RDS via SSM.

Steps:
  1. Creates the portal_patron_characters table
  2. Backfills all existing characters to jim@jimmcq.com's Google ID

Usage:
  /tmp/boto-venv/bin/python3 scripts/migrate-patron-characters.py

Prereqs:
  python3 -m venv /tmp/boto-venv && /tmp/boto-venv/bin/pip install boto3
"""

import json
import time
import urllib.parse
import boto3

INSTANCE_ID = "i-0c3a649ec76805742"
RDS_SECRET_PREFIX = "rds!db-"
RDS_HOST = None  # will be looked up
DB_NAME = "wyrmbarrow"
REGION = "us-east-1"

session = boto3.Session(profile_name="terraform-bootstrap", region_name=REGION)
ssm = session.client("ssm")
rds = session.client("rds")
sm = session.client("secretsmanager")


def get_rds_credentials():
    """Retrieve RDS endpoint and password from Secrets Manager."""
    # Get endpoint
    instances = rds.describe_db_instances(DBInstanceIdentifier="wyrmbarrow")
    db = instances["DBInstances"][0]
    host = db["Endpoint"]["Address"]
    port = db["Endpoint"]["Port"]

    # Get password from Secrets Manager (managed by RDS)
    secret_arn = db["MasterUserSecret"]["SecretArn"]
    secret = sm.get_secret_value(SecretId=secret_arn)
    creds = json.loads(secret["SecretString"])

    return host, port, creds["username"], creds["password"]


def run_sql(dsn, sql, description):
    """Run SQL on RDS via SSM → Docker psql."""
    print(f"\n>>> {description}")
    cmd = f'docker run --rm postgres:16 psql "{dsn}" -c "{sql}"'
    resp = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={"commands": [cmd]},
    )
    command_id = resp["Command"]["CommandId"]

    # Poll for result
    for _ in range(30):
        time.sleep(2)
        result = ssm.get_command_invocation(
            CommandId=command_id, InstanceId=INSTANCE_ID
        )
        if result["Status"] in ("Success", "Failed", "TimedOut", "Cancelled"):
            break

    print(f"Status: {result['Status']}")
    if result["StandardOutputContent"]:
        print(result["StandardOutputContent"])
    if result["StandardErrorContent"]:
        print(f"STDERR: {result['StandardErrorContent']}")
    return result["Status"] == "Success"


def main():
    host, port, username, password = get_rds_credentials()
    encoded_pw = urllib.parse.quote(password, safe="")
    dsn = f"postgresql://{username}:{encoded_pw}@{host}:{port}/{DB_NAME}"

    # 1. Create table
    create_sql = (
        "CREATE TABLE IF NOT EXISTS portal_patron_characters ("
        "id TEXT NOT NULL PRIMARY KEY, "
        "patron_google_id TEXT NOT NULL, "
        "character_id INTEGER NOT NULL UNIQUE, "
        "character_name TEXT NOT NULL, "
        "created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP"
        "); "
        "CREATE INDEX IF NOT EXISTS portal_patron_characters_patron_google_id_idx "
        "ON portal_patron_characters(patron_google_id);"
    )
    run_sql(dsn, create_sql, "Creating portal_patron_characters table")

    # 2. Look up jim@jimmcq.com's Google ID from portal_patrons
    print("\n>>> Looking up Google ID for jim@jimmcq.com")
    lookup_sql = "SELECT google_id FROM portal_patrons WHERE email = 'jim@jimmcq.com';"
    cmd = f'docker run --rm postgres:16 psql "{dsn}" -t -A -c "{lookup_sql}"'
    resp = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={"commands": [cmd]},
    )
    command_id = resp["Command"]["CommandId"]
    for _ in range(30):
        time.sleep(2)
        result = ssm.get_command_invocation(
            CommandId=command_id, InstanceId=INSTANCE_ID
        )
        if result["Status"] in ("Success", "Failed", "TimedOut", "Cancelled"):
            break

    google_id = result["StandardOutputContent"].strip()
    if not google_id:
        print("ERROR: No patron found for jim@jimmcq.com")
        print("Falling back: listing all patrons...")
        list_sql = "SELECT email, google_id FROM portal_patrons;"
        run_sql(dsn, list_sql, "Listing all patrons")
        return

    print(f"Google ID: {google_id}")

    # 3. Backfill: find all characters and link them to this patron
    # Evennia characters have db_typeclass_path = 'typeclasses.characters.Character'
    backfill_sql = (
        "INSERT INTO portal_patron_characters (id, patron_google_id, character_id, character_name, created_at) "
        "SELECT gen_random_uuid()::text, "
        f"'{google_id}', "
        "id, db_key, db_date_created "
        "FROM objects_objectdb "
        "WHERE db_typeclass_path = 'typeclasses.characters.Character' "
        "ON CONFLICT (character_id) DO NOTHING;"
    )
    run_sql(dsn, backfill_sql, "Backfilling all characters to jim@jimmcq.com")

    # 4. Verify
    run_sql(dsn, "SELECT * FROM portal_patron_characters;", "Verifying results")


if __name__ == "__main__":
    main()
