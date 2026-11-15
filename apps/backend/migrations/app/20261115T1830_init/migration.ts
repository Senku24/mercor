#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/d6bf1a9fbff9ca91959531c596977dfb3355b77c7c4a90c5d5b0e8d21f0f4164/contract';
import endContract from '../../snapshots/d6bf1a9fbff9ca91959531c596977dfb3355b77c7c4a90c5d5b0e8d21f0f4164/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'Interview',
        columns: [
          col('githubMetaData', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('score', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Interview_status_check_2bd96623',
            sql`"status" IN ('Pre', 'InProgress', 'Done')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Message',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('interviewId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('message', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('Message_type_check_a77b64d6', sql`"type" IN ('User', 'Assistant')`),
        ],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Message',
        index: 'Message_interviewId_idx_766b64f2',
        columns: ['interviewId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Message',
        foreignKey: {
          name: 'Message_interviewId_fkey',
          columns: ['interviewId'],
          references: { schema: 'public', table: 'Interview', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
