#!/usr/bin/env node
/**
 * Prisma Production Safety Guard
 *
 * Prevents destructive Prisma commands from running against production.
 *
 * CRITICAL PROTECTION:
 * Prisma treats portal_patron_characters as owned schema and will truncate
 * or recreate it during migrations, destroying character-patron linkage rows
 * written by the Evennia game server.
 *
 * This guard ensures:
 * 1. prisma db push is never run against production
 * 2. prisma migrate reset is never run against production
 * 3. prisma generate (safe) is always allowed
 * 4. Development/local commands are unrestricted
 *
 * Usage:
 *   node scripts/prisma-production-guard.js [command]
 *
 * Examples:
 *   node scripts/prisma-production-guard.js generate   # OK — safe
 *   node scripts/prisma-production-guard.js db push    # BLOCKED on prod
 *   node scripts/prisma-production-guard.js migrate reset  # BLOCKED on prod
 */

const fs = require("fs");
const path = require("path");

// Read DATABASE_URL from environment or .env files
function getDatabaseUrl() {
  // Priority: NODE_ENV check, then environment variables
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Try .env.production.local (production override)
  try {
    const prodLocal = fs.readFileSync(
      path.join(__dirname, "../.env.production.local"),
      "utf8"
    );
    const match = prodLocal.match(/^DATABASE_URL=(.+)$/m);
    if (match) return match[1];
  } catch {
    // File doesn't exist or is unreadable
  }

  // Try .env.production
  try {
    const prod = fs.readFileSync(
      path.join(__dirname, "../.env.production"),
      "utf8"
    );
    const match = prod.match(/^DATABASE_URL=(.+)$/m);
    if (match) return match[1];
  } catch {
    // File doesn't exist or is unreadable
  }

  return null;
}

// Detect if DATABASE_URL points to production
function isProduction(databaseUrl) {
  if (!databaseUrl) return false;

  // Check for production indicators:
  // - Contains a hostname (not localhost, 127.0.0.1)
  // - Contains known production domain patterns
  // - Vercel Postgres syntax (*.postgres.vercel.com)
  // - AWS RDS syntax (*.rds.amazonaws.com)

  const url = databaseUrl.toLowerCase();

  // Always safe: localhost, 127.0.0.1, unix socket
  if (
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes("localhost:")
  ) {
    return false;
  }

  // Unsafe: contains production domain patterns
  const productionPatterns = [
    "postgres.vercel.com", // Vercel Postgres
    "rds.amazonaws.com", // AWS RDS
    "wyrmbarrow.com", // Custom domain
    ".rds.", // RDS variants
    "prod", // Production in hostname
  ];

  return productionPatterns.some((pattern) => url.includes(pattern));
}

// Check if command is destructive
function isDestructiveCommand(command) {
  const destructive = [
    "db push",
    "migrate reset",
    "migrate deploy", // Warn on deploy too
    "seed",
  ];

  return destructive.some((cmd) => command.toLowerCase().includes(cmd));
}

function main() {
  // Get the prisma command from process.argv
  // Example: ["node", "prisma-production-guard.js", "db", "push"]
  const args = process.argv.slice(2);
  const command = args.join(" ");

  const databaseUrl = getDatabaseUrl();
  const prod = isProduction(databaseUrl);
  const destructive = isDestructiveCommand(command);

  // Safe commands always allowed
  if (!destructive) {
    // console.log(`[Prisma Guard] ✓ Safe command: ${command}`);
    process.exit(0);
  }

  // Destructive command on production — BLOCK
  if (destructive && prod) {
    console.error("\n" + "=".repeat(80));
    console.error("🔒 PRISMA PRODUCTION SAFETY GUARD — COMMAND BLOCKED");
    console.error("=".repeat(80));
    console.error();
    console.error(`Command:     ${command}`);
    console.error(`Database:    ${databaseUrl}`);
    console.error();
    console.error("REASON:");
    console.error("  This command would modify the production database schema in a way that");
    console.error("  could destroy character-patron linkage rows written by Evennia.");
    console.error();
    console.error("  Prisma treats portal_patron_characters as owned schema and will");
    console.error("  truncate or recreate it during migrations.");
    console.error();
    console.error("WHAT TO DO INSTEAD:");
    console.error("  1. For production schema changes: Use the Evennia REST API directly");
    console.error("  2. Document your migration in memory/feedback_rds_migrations.md");
    console.error("  3. Ask the maintainer to run migrations via boto3 SSM:");
    console.error("     docker compose -f /opt/wyrmbarrow/docker-compose.prod.yml \\");
    console.error("       exec -T evennia psql ... < migration.sql");
    console.error();
    console.error("OVERRIDE (if you know what you're doing):");
    console.error("  Set PRISMA_SKIP_VALIDATION=true before running the command:");
    console.error();
    console.error("  PRISMA_SKIP_VALIDATION=true npx prisma " + command);
    console.error();
    console.error("=".repeat(80));
    console.error();

    process.exit(1);
  }

  // Destructive command on development — allow with warning
  if (destructive && !prod) {
    console.warn(
      `⚠️  [Prisma Guard] Running: ${command} (on local/dev database)`
    );
    process.exit(0);
  }
}

main();
