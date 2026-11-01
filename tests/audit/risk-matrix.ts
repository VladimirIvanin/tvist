import { domains, generateMatrix } from './matrix';
import { riskGeometryCases, riskGeometryManifest } from './risk-geometry';
import { riskInputCases, riskInputManifest } from './risk-input';
import { riskMediaCases, riskMediaManifest } from './risk-media';
import { verifyRiskCoverage, type RiskFamilyManifest } from './risk-coverage';

export const additionalRiskCases = [...riskGeometryCases, ...riskInputCases, ...riskMediaCases];
/** R01 witnesses are the existing geometry rows, not a claim to have rerun them here. */
export const riskManifests: RiskFamilyManifest[] = [
  {
    family: 'R01',
    domains: { loop: domains.loop, count: domains.count, group: domains.group },
    tuples: generateMatrix().rows.map((row, index) => ({
      id: `MATRIX-${index}`,
      factors: {
        loop: domains.loop[row.loop]!,
        count: domains.count[row.count]!,
        group: domains.group[row.group]!,
      },
    })),
  },
  ...riskGeometryManifest,
  ...riskInputManifest,
  ...riskMediaManifest,
];
export function assertRiskDeclaration(): void {
  const verification = verifyRiskCoverage(riskManifests);
  if (verification.errors.length)
    throw new Error(`RISK_DECLARATION: ${verification.errors.join('\n')}`);
  const ids = new Set(additionalRiskCases.map((c) => c.id));
  if (ids.size !== additionalRiskCases.length) throw new Error('RISK_DUPLICATE_CASE');
  for (const family of riskManifests.filter((f) => f.family !== 'R01'))
    for (const tuple of family.tuples)
      if (!ids.has(tuple.id)) throw new Error(`RISK_UNRUNNABLE_TUPLE: ${tuple.id}`);
}
/** Declared mobile subset. Native Chromium touch is independently covered by NINPUT cases. */
export function mobileRiskCase(id: string): boolean {
  const family = riskManifests.find((group) => group.tuples.some((tuple) => tuple.id === id));
  if (family?.family === 'R06') return true;
  return (
    family?.family === 'R04' &&
    family.tuples.find((tuple) => tuple.id === id)?.factors.cancel !== 'lostcapture'
  );
}
