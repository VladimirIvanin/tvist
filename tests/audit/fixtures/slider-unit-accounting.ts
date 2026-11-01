export interface SliderUnitCommand {
  op: number;
  value: number;
  flag: boolean;
}
export interface SliderUnitRecord {
  family: number;
  seed: number;
  commands: SliderUnitCommand[];
  status: 'pass' | 'failure' | 'harness-error';
  attempted: number;
  verified: number;
  blocked: number;
  failure?: { oracle: string; detail: string; step: number };
  cleanupErrors: string[];
  durationMs: number;
}

/** Independent evidence validation; completion includes recorded failures, never missing seeds. */
export function validateSliderUnitCohort(
  records: readonly SliderUnitRecord[],
  family: number,
  firstSeed: number,
  count: number
): string[] {
  const errors: string[] = [];
  const seen = new Set<number>();
  for (const record of records) {
    const key = `${record.family}/${record.seed}`;
    if (
      record.family !== family ||
      !Number.isInteger(record.seed) ||
      record.seed < firstSeed ||
      record.seed >= firstSeed + count
    )
      errors.push(`unexpected-seed:${key}`);
    if (seen.has(record.seed)) errors.push(`duplicate-seed:${key}`);
    seen.add(record.seed);
    if (
      !Array.isArray(record.commands) ||
      record.commands.length < 1 ||
      record.commands.length > 200 ||
      record.commands.some(
        (command) =>
          !Number.isInteger(command.op) ||
          command.op < 0 ||
          command.op > 7 ||
          !Number.isInteger(command.value) ||
          command.value < 0 ||
          command.value > 30 ||
          typeof command.flag !== 'boolean'
      )
    )
      errors.push(`malformed-commands:${key}`);
    const planned = record.commands?.length ?? 0;
    if (
      ![record.attempted, record.verified, record.blocked].every(
        (value) => Number.isInteger(value) && value >= 0
      ) ||
      record.attempted + record.blocked !== planned ||
      record.verified > record.attempted
    )
      errors.push(`invalid-accounting:${key}`);
    if (!['pass', 'failure', 'harness-error'].includes(record.status))
      errors.push(`invalid-status:${key}`);
    if (
      record.status === 'pass' &&
      (record.verified !== planned ||
        record.attempted !== planned ||
        record.blocked !== 0 ||
        record.failure)
    )
      errors.push(`false-pass:${key}`);
    if (record.status !== 'pass' && !record.failure?.oracle) errors.push(`missing-failure:${key}`);
  }
  for (let seed = firstSeed; seed < firstSeed + count; seed++)
    if (!seen.has(seed)) errors.push(`missing-seed:${family}/${seed}`);
  return errors;
}
