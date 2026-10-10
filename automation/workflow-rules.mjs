import { createHash } from 'node:crypto';
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).filter(k=>k!=='approval').sort().map(k=>[k,stable(value[k])]));return value;}
export const analysisFingerprint=analysis=>createHash('sha256').update(JSON.stringify(stable(analysis))).digest('hex');
export const analysisReady=analysis=>!!analysis&&analysis.needsReview===false&&Array.isArray(analysis.missingInformation)&&analysis.missingInformation.length===0&&Array.isArray(analysis.outOfScope)&&analysis.outOfScope.length===0&&typeof analysis.codexPrompt==='string'&&analysis.codexPrompt.length>=200;
export const approvedBuildJob=job=>analysisReady(job.analysis)&&job.analysis.approval?.revision===job.revision&&job.analysis.approval?.fingerprint===analysisFingerprint(job.analysis)&&typeof job.analysis.approval?.actor==='string'&&!!job.analysis.approval?.scope&&!!job.analysis.approval?.deadline;
