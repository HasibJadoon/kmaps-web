-- The daily routine made whole (owner, 2026-10-21: "include all necessary exercises a day, max 20, should cover all
-- basics"): twenty low-impact moves in the order a session runs — warm up, legs, upper body (push and pull), core,
-- balance, cool down — each beside a wall, a chair or a park bench, nothing that jumps. `part` heads the groups.
-- Videos: a chosen demonstration where one was found, a YouTube search for the move otherwise.

ALTER TABLE core_body_routine_item ADD COLUMN part TEXT NOT NULL DEFAULT 'Main';

INSERT OR REPLACE INTO core_body_routine_item (key, seq, part, name, reps, unit, icon, tone, cue, easier, place, video_url) VALUES
-- warm up
('march',      1, 'Warm up',    'March in place',          10, 'each side', 'figure.walk.motion',                  'sage',  'Lift each knee to hip height, swing the arms, stand tall.', 'Hold a wall or chair back for balance.', 'home or park', 'https://www.youtube.com/watch?v=Iccv7TpkDks'),
('armcircles', 2, 'Warm up',    'Arm circles',             10, 'each way',  'figure.arms.open',                    'sand',  'Arms out to the sides, small circles growing bigger; then the other way.', 'Smaller circles, one arm at a time.', 'home or park', 'https://www.youtube.com/results?search_query=arm+circles+warm+up+beginner'),
('kneeraise',  3, 'Warm up',    'Standing knee raise',     10, 'each side', 'figure.highintensity.intervaltraining', 'teal', 'Stand tall, bring one knee up toward the chest, lower with control.', 'Hold a wall or tree.', 'home or park', 'https://www.youtube.com/watch?v=Iccv7TpkDks'),
-- legs
('sitstand',   4, 'Legs',       'Sit to stand',            10, 'reps',      'figure.cross.training',               'plum',  'From a sturdy chair or bench, stand up with the legs, sit back down slowly.', 'Use your hands on your knees to help.', 'home or park', 'https://www.nhs.uk/live-well/exercise/strength-and-flexibility-exercises/strength-exercises/'),
('wallsit',    5, 'Legs',       'Wall sit',                10, 'breaths',   'figure.strengthtraining.traditional', 'mauve', 'Back flat on a wall, slide down a little, knees over ankles; breathe slowly.', 'Only a shallow bend.', 'home or park', 'https://www.youtube.com/watch?v=rHRVy2j85EE'),
('stepup',     6, 'Legs',       'Step-up',                 10, 'each side', 'figure.step.training',                'rust',  'Step up onto a stair or low bench with the whole foot, stand tall, step down.', 'Use the lowest step and a rail.', 'home or park', 'https://www.youtube.com/watch?v=eYIUPRMm13A'),
('lunge',      7, 'Legs',       'Supported reverse lunge', 10, 'each side', 'figure.walk',                         'sage',  'Hold a chair, step one foot back, bend both knees a little, step back in.', 'A small step back, a small bend.', 'home or park', 'https://www.youtube.com/results?search_query=supported+reverse+lunge+chair+beginner'),
('sideleg',    8, 'Legs',       'Standing side leg raise', 10, 'each side', 'figure.barre',                        'sand',  'Hold a chair, lift one leg out to the side, toes forward, lower slowly.', 'A smaller lift.', 'home or park', 'https://www.youtube.com/results?search_query=standing+side+leg+raise+beginner'),
('bridge',     9, 'Legs',       'Glute bridge',            10, 'reps',      'figure.core.training',                'teal',  'On your back, knees bent, press through the heels and lift the hips; hold one second.', 'Smaller lift, slower lowering.', 'home', 'https://www.youtube.com/watch?v=iwHvjHh59f8'),
('calfraise', 10, 'Legs',       'Calf raise',              10, 'reps',      'figure.stairs',                       'plum',  'Hands on a wall, rise onto the toes, pause, lower slowly.', 'Both hands on the wall, small rise.', 'home or park', 'https://www.youtube.com/results?search_query=calf+raises+beginner+form'),
-- upper body
('wallpush',  11, 'Upper body', 'Wall push-up',            10, 'reps',      'figure.strengthtraining.functional',  'mauve', 'Hands on the wall at chest height, body straight, chest to the wall and back.', 'Stand closer to the wall.', 'home or park', 'https://www.youtube.com/watch?v=YB0egDzsu18'),
('inclinepush',12,'Upper body', 'Incline push-up',         10, 'reps',      'figure.strengthtraining.functional',  'rust',  'Hands on a bench or table edge, body in one line, lower the chest, push back.', 'Go back to the wall.', 'home or park', 'https://www.youtube.com/watch?v=PwQm5urhZsQ'),
('wallangel', 13, 'Upper body', 'Wall angel',              10, 'reps',      'figure.arms.open',                    'sage',  'Back and arms on the wall, slide the arms up and down like a slow snow angel.', 'Stand a step away from the wall.', 'home or park', 'https://www.youtube.com/watch?v=HKxYl-6fAF8'),
('towelrow',  14, 'Upper body', 'Towel row',               10, 'reps',      'figure.rower',                        'sand',  'Loop a towel round a post or door handle, lean back a little, pull the chest to the hands.', 'Stand more upright.', 'park', 'https://www.youtube.com/results?search_query=towel+row+door+bodyweight+beginner'),
-- core
('birddog',   15, 'Core',       'Bird dog',                10, 'each side', 'figure.mind.and.body',                'teal',  'On hands and knees, reach one arm and the opposite leg long; keep the back flat.', 'Move only the leg, or only the arm.', 'home', 'https://www.youtube.com/watch?v=oV1_T-5ksj8'),
('deadbug',   16, 'Core',       'Dead bug',                10, 'each side', 'figure.pilates',                      'plum',  'On your back, arms up, lower the opposite arm and leg slowly; low back stays down.', 'Lower only the legs, heels tapping the floor.', 'home', 'https://www.youtube.com/watch?v=XcYtWYMz39w'),
('plank',     17, 'Core',       'Incline plank',           10, 'breaths',   'figure.cooldown',                     'mauve', 'Hands on a bench, a table or a wall, body in one line, breathe slowly ten times.', 'Hands on a wall instead of a bench.', 'home or park', 'https://www.youtube.com/watch?v=8BPRH34Z8Ak'),
('sideplank', 18, 'Core',       'Side plank on knees',     10, 'breaths',   'figure.core.training',                'rust',  'On one forearm and knee, hips lifted in a line from knee to shoulder; then the other side.', 'Hips lower, shorter hold.', 'home', 'https://www.youtube.com/watch?v=oEs8ZvVDOzI'),
-- balance
('balance',   19, 'Balance',    'Single-leg stand',        10, 'breaths',   'figure.stand',                        'sage',  'Beside a wall or tree, lift one foot a little, stand tall and still; then the other.', 'A fingertip on the wall.', 'home or park', 'https://www.youtube.com/results?search_query=single+leg+balance+beginner+exercise'),
-- cool down
('stretch',   20, 'Cool down',  'Cool-down stretch',       10, 'breaths',   'figure.flexibility',                  'sand',  'Neck, chest, arms, hamstrings, thighs, calves: ten slow breaths in each stretch.', 'Shorter stretches, never into pain.', 'home or park', 'https://www.youtube.com/watch?v=yW5tv05K9D4');

-- the whole set's follow-along stays the beginner full-body video; the routine's words say twenty
UPDATE core_app_label SET detail = 'Twenty moves, ten each — warm up to cool down, home or park'
 WHERE scope = 'body_ui' AND key = 'routine';
