#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/9f96428f85e12485ee8306146cdfce6cfd6d2d926d3a92df7b66957a77efe5d6/contract';
import endContract from '../../snapshots/9f96428f85e12485ee8306146cdfce6cfd6d2d926d3a92df7b66957a77efe5d6/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d6bf1a9fbff9ca91959531c596977dfb3355b77c7c4a90c5d5b0e8d21f0f4164/contract';
import startContract from '../../snapshots/d6bf1a9fbff9ca91959531c596977dfb3355b77c7c4a90c5d5b0e8d21f0f4164/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropDefault({ schema: 'public', table: 'Interview', column: 'score' }),
      this.addColumn({
        schema: 'public',
        table: 'Interview',
        column: col('callId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Interview',
        column: col('createdAt', 'timestamptz(3)', {
          notNull: true,
          default: fn(sql`now()`),
          codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Interview',
        column: col('feedback', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Interview',
        column: col('startedAt', 'timestamptz(3)', {
          codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Message',
        column: col('createdAt', 'timestamptz(3)', {
          notNull: true,
          default: fn(sql`now()`),
          codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
        }),
      }),
      this.dropNotNull({ schema: 'public', table: 'Interview', column: 'score' }),
      this.addColumnWithTemporaryDefault({
        schema: 'public',
        table: 'Interview',
        column: 'accessToken',
        type: 'text',
        temporaryDefault: sql`replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')`,
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
