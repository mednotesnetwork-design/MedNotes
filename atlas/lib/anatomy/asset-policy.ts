import type { Asset } from './schema';
export const allowedLicenses = new Set(['CC0-1.0', 'Public Domain', 'MedNote Original', 'CC-BY-4.0', 'CC-BY-SA-4.0']);
/** License eligibility is separate from anatomical validation. */
export function eligibleAsset(asset: Asset): boolean {
 const p=asset.provenance;
 return !!p && allowedLicenses.has(p.license) && p.verified === true && p.dependenciesEligible === true && /^https:\/\//.test(p.sourceUrl) && /^[a-f0-9]{64}$/i.test(p.sha256) && (!p.license.startsWith('CC-BY') || (!!p.creator && !!p.changes && p.attributionNotice === '/models/LICENSES.txt' && p.licenseUrl === (p.license === 'CC-BY-SA-4.0' ? 'https://creativecommons.org/licenses/by-sa/4.0/' : 'https://creativecommons.org/licenses/by/4.0/')));
}
