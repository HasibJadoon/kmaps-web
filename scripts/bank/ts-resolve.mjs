// The workers are bundled, so their imports are extensionless. Node is not a
// bundler; this teaches it the one rule it is missing and nothing else.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
register('./ts-resolve-hooks.mjs', pathToFileURL('./scripts/bank/'));
