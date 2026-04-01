import type { Pool } from 'pg';

/**
 * @deprecated Schema is now managed by Prisma in @runwell/bib-core.
 * Run `prisma migrate deploy` instead.
 * See packages/core/prisma/schema.prisma for BotVisitorProfile, BotConversation, BotMessage models.
 */
export async function runMigration(_pool: Pool): Promise<void> {
  console.warn(
    '[bot-memory] runMigration() is deprecated. Schema is managed by Prisma. Run `prisma migrate deploy` instead.'
  );
}
