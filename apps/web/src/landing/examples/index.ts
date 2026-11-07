import { EXAMPLE_DATA } from './data';
import { DemoExampleSchema, type DemoExample } from './schema';

export type { DemoExample } from './schema';

// Validated once at load: a malformed example fails the build, not a visitor's page.
export const EXAMPLES: readonly DemoExample[] = EXAMPLE_DATA.map((example) =>
  DemoExampleSchema.parse(example),
);

const [FIRST] = EXAMPLES;
if (FIRST === undefined) throw new Error('the example set is empty');

/** Example shown when none is asked for: the first one of the data set. */
export const DEFAULT_EXAMPLE_ID: string = FIRST.id;

export function getExample(id: string): DemoExample | undefined {
  return EXAMPLES.find((example) => example.id === id);
}
