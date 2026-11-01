export type RiskLevel = string | number | boolean;
export interface RiskFamilyManifest {
  family: string;
  domains: Record<string, readonly RiskLevel[]>;
  tuples: Array<{ id: string; factors: Record<string, RiskLevel> }>;
}
/** Independent finite-domain enumerator. It never imports the scenario factories. */
export function verifyRiskCoverage(families: readonly RiskFamilyManifest[]) {
  const errors: string[] = [];
  const familyNames = new Set<string>();
  const reports = families.map((family) => {
    if (familyNames.has(family.family)) errors.push(`duplicate-family:${family.family}`);
    familyNames.add(family.family);
    const factors = Object.keys(family.domains).sort();
    if (!factors.length) errors.push(`empty-domain:${family.family}`);
    const expected: string[] = [];
    const encode = (row: Record<string, RiskLevel>) =>
      JSON.stringify(factors.map((key) => [key, row[key]]));
    const enumerate = (depth: number, row: Record<string, RiskLevel>) => {
      if (depth === factors.length) {
        expected.push(encode(row));
        return;
      }
      const key = factors[depth]!;
      const levels = family.domains[key]!;
      if (
        !levels.length ||
        new Set(levels.map((level) => JSON.stringify(level))).size !== levels.length
      )
        errors.push(`invalid-levels:${family.family}:${key}`);
      for (const value of levels) enumerate(depth + 1, { ...row, [key]: value });
    };
    enumerate(0, {});
    const witnesses = new Map<string, string[]>();
    for (const tuple of family.tuples) {
      if (JSON.stringify(Object.keys(tuple.factors).sort()) !== JSON.stringify(factors))
        errors.push(`invalid-factors:${family.family}:${tuple.id}`);
      if (factors.some((key) => !family.domains[key]!.includes(tuple.factors[key]!)))
        errors.push(`invalid-value:${family.family}:${tuple.id}`);
      const key = encode(tuple.factors);
      witnesses.set(key, [...(witnesses.get(key) ?? []), tuple.id]);
    }
    const missing = expected.filter((key) => !witnesses.has(key));
    for (const key of missing) errors.push(`missing:${family.family}:${key}`);
    return {
      family: family.family,
      domains: family.domains,
      required: expected.length,
      witnessed: expected.length - missing.length,
      missing,
      witnesses: expected.map((key) => ({
        tuple: JSON.parse(key) as [string, RiskLevel][],
        cases: witnesses.get(key) ?? [],
      })),
    };
  });
  return { errors, families: reports };
}
/** Execution coverage is separate from generation: an early failure leaves the rest of that case unverified. */
export function riskExecutionCoverage(
  families: readonly RiskFamilyManifest[],
  rows: readonly { id: string; project: string; status: string }[],
  projects: readonly string[]
) {
  const declaration = verifyRiskCoverage(families);
  return {
    ...declaration,
    executions: declaration.families.flatMap((family) =>
      projects.map((project) => ({
        family: family.family,
        project,
        required: family.required,
        invoked: family.witnesses.filter((tuple) =>
          rows.some((row) => row.project === project && tuple.cases.includes(row.id))
        ).length,
        completedPass: family.witnesses.filter((tuple) =>
          rows.some(
            (row) =>
              row.project === project && tuple.cases.includes(row.id) && row.status === 'pass'
          )
        ).length,
        note: 'Invocation is not full action/assertion completion. Non-pass cases retain blocked tails in raw evidence.',
      }))
    ),
  };
}
