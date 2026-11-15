#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/46f7004a7c480a4c602dac4bd7d727fb1f92e65be2c8a8b4440ab85d714d69cb/contract';
import endContract from '../../snapshots/46f7004a7c480a4c602dac4bd7d727fb1f92e65be2c8a8b4440ab85d714d69cb/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/9f96428f85e12485ee8306146cdfce6cfd6d2d926d3a92df7b66957a77efe5d6/contract';
import startContract from '../../snapshots/9f96428f85e12485ee8306146cdfce6cfd6d2d926d3a92df7b66957a77efe5d6/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Interview',
        column: col('clientSecretIssued', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
