import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
register('./ts-resolve-hooks.mjs', pathToFileURL('./scripts/bank/'));
