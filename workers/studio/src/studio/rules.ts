/// The done-rules: when a sprint stage counts as done, written as data (st_stage.done_rule_json) and evaluated here over
/// an episode's own rows. An episode's stage is never stored — it is the first stage whose rule does not hold yet.
///
///   {"all": [rule, …]}                 every rule holds
///   {"any": [rule, …]}                 at least one holds
///   {"not": rule}
///   {"checks": "ready.*"}              every defined check with that key (or prefix*) was reported pass (na counts too)
///   {"has": "scenes_ref"}              the episode has that ref / field set
///   {"resources": "tafsir", "min": 5}  at least min resources in that group (min defaults to 1)
///   {"takes_min": 1}                   at least n kept takes
///   {"publication": "long"}            that part has gone out
///   {}                                 always true (a stage with no rule is done once reached)

export type Rule = Record<string, unknown>;

export interface EpisodeFacts {
  refs: Record<string, string | null | undefined>;      // scenes_ref, slides_ref, boundary_ref, folder_path …
  checks: Record<string, string>;                         // check_key → pass | fail | na (reported)
  defined_checks: string[];                               // every st_check key of the workflow
  resources: Record<string, number>;                      // group_key → count
  takes: number;                                          // kept takes
  publications: string[];                                 // part keys that went out
}

const matches = (key: string, pattern: string) => (pattern.endsWith('*') ? key.startsWith(pattern.slice(0, -1)) : key === pattern);

export function holds(rule: Rule | null | undefined, f: EpisodeFacts): boolean {
  if (!rule || typeof rule !== 'object') return true;
  const keys = Object.keys(rule);
  if (keys.length === 0) return true;
  if (Array.isArray(rule['all'])) return (rule['all'] as Rule[]).every((r) => holds(r, f));
  if (Array.isArray(rule['any'])) return (rule['any'] as Rule[]).some((r) => holds(r, f));
  if (rule['not'] && typeof rule['not'] === 'object') return !holds(rule['not'] as Rule, f);
  if (typeof rule['checks'] === 'string') {
    const wanted = f.defined_checks.filter((k) => matches(k, rule['checks'] as string));
    return wanted.length > 0 && wanted.every((k) => f.checks[k] === 'pass' || f.checks[k] === 'na');
  }
  if (typeof rule['has'] === 'string') return !!f.refs[rule['has'] as string];
  if (typeof rule['resources'] === 'string') {
    const min = typeof rule['min'] === 'number' ? (rule['min'] as number) : 1;
    return (f.resources[rule['resources'] as string] ?? 0) >= min;
  }
  if (typeof rule['takes_min'] === 'number') return f.takes >= (rule['takes_min'] as number);
  if (typeof rule['publication'] === 'string') return f.publications.includes(rule['publication'] as string);
  return false;   // an unknown rule never holds: a typo in the registry shows as "not done", never as done
}

export interface StageDef { key: string; seq: number; done_rule: Rule }
export interface StageState { key: string; state: 'done' | 'current' | 'next' }

/// Each stage's state, in order: done while their rules hold from the start, then the current one, then next.
export function stageStates(stages: StageDef[], f: EpisodeFacts): StageState[] {
  const ordered = [...stages].sort((a, b) => a.seq - b.seq);
  let open = true;
  return ordered.map((s) => {
    if (open && holds(s.done_rule, f)) return { key: s.key, state: 'done' as const };
    if (open) { open = false; return { key: s.key, state: 'current' as const }; }
    return { key: s.key, state: 'next' as const };
  });
}

/// The episode's stage: the current one, or the last stage when every rule holds (it is finished).
export function stageOf(stages: StageDef[], f: EpisodeFacts): string | null {
  const st = stageStates(stages, f);
  return (st.find((s) => s.state === 'current') ?? st[st.length - 1])?.key ?? null;
}
