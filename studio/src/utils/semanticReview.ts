export const semanticLabels=['supported','contradicted','not_in_reference','uncertain'] as const;
export type SemanticLabel=typeof semanticLabels[number];
export interface SemanticClaim {claim:string;label:SemanticLabel;evidence:string;reason:string;evidenceStatus:'exact_quote'|'no_quote'|'quote_not_found'}
export function validateSemanticReview(raw:unknown,reference:string):SemanticClaim[]{
 const x=raw as {claims?:unknown};if(!x||!Array.isArray(x.claims)||x.claims.length<1||x.claims.length>20)throw Error('Review must contain1to20claim suggestions.');
 return x.claims.map((v:unknown)=>{const c=v as Record<string,unknown>;if(!c||typeof c.claim!=='string'||!c.claim.trim()||c.claim.length>4000||!semanticLabels.includes(c.label as SemanticLabel)||typeof c.evidence!=='string'||typeof c.reason!=='string'||!c.reason.trim())throw Error('Invalid claim review format.');const exact=!!c.evidence.trim()&&reference.includes(c.evidence);return {claim:c.claim,label:((c.label==='supported'||c.label==='contradicted')&&!exact?'uncertain':c.label) as SemanticLabel,evidence:c.evidence,reason:c.reason,evidenceStatus:exact?'exact_quote':c.evidence.trim()?'quote_not_found':'no_quote'};});
}
export function semanticCounts(claims:SemanticClaim[]){return Object.fromEntries(semanticLabels.map(label=>[label,claims.filter(c=>c.label===label).length]));}
export const semanticFixtures=[
 {id:'supported',reference:'The OmniFlow trial lasts 14 days. No credit card is required.',answer:'The trial lasts 14 days.',expected:'supported'},
 {id:'contradicted',reference:'The OmniFlow trial lasts 14 days. No credit card is required.',answer:'The trial lasts 30 days.',expected:'contradicted'},
 {id:'absent',reference:'The OmniFlow trial lasts 14 days. No credit card is required.',answer:'OmniFlow has an office on Mars.',expected:'not_in_reference'},
] as const;
