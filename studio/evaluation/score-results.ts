/** Offline recomputation. No API, secrets or network. `npm run score:reviewer -- results.json` */
import fs from 'node:fs';
import {reviewerCases,reviewerProvenance} from '../src/data/reviewerCases';
import {parsePredictionImport,scorePredictions} from '../src/utils/reviewerBenchmark';
const file=process.argv[2];if(!file)throw Error('Supply exported reviewer-results JSON.');
const predictions=parsePredictionImport(JSON.parse(fs.readFileSync(file,'utf8')));
console.log(JSON.stringify({provenance:reviewerProvenance,importedProvenance:'unverified',metrics:scorePredictions(reviewerCases,predictions)},null,2));
