// Default plan structure (from original static HTML)
// Used when creating first plan for a new user

module.exports = {
  name: 'Weekly Grind',
  equipment_tags: [
    'Hoist Power Rack',
    'Barbell + Plates',
    'Adjustable Dumbbells',
    'EZ Curl Bar',
    'Adjustable Bench',
    'TRX',
    'Resistance Bands',
    'Kettlebell',
    'Medicine Ball',
    'Ab Wheel',
    'Balance Disc',
  ],
  days: [
    {
      day_number: 1,
      name: 'Monday — Upper Body Push/Pull',
      type: 'upper',
      duration: '55–65 min',
      sections: [
        {
          title: 'Warm-Up — 5 min',
          exercises: [
            { name: 'TRX Face Pulls', sets_reps: '2 × 15', notes: 'Activate rear delts' },
            { name: 'Band Pull-Aparts', sets_reps: '2 × 20', notes: 'Resistance band' },
            { name: 'Arm Circles + Shoulder Rolls', sets_reps: '30 sec each', notes: 'Bodyweight' },
          ],
        },
        {
          title: 'Main Work',
          exercises: [
            { name: 'Barbell Bench Press', sets_reps: '4 × 6–8', notes: 'Rest 90 sec' },
            { name: 'Barbell Bent-Over Row', sets_reps: '4 × 8', notes: 'Rest 90 sec' },
            { name: 'Dumbbell Incline Press', sets_reps: '3 × 10', notes: 'Bench + DBs' },
            { name: 'TRX Row (feet elevated)', sets_reps: '3 × 12', notes: 'Control the negative' },
            { name: 'Dumbbell Lateral Raises', sets_reps: '3 × 15', notes: 'Slow, no swinging' },
            { name: 'EZ Bar Curl', sets_reps: '3 × 12', notes: 'Full range of motion' },
            { name: 'Tricep Pushdowns (band)', sets_reps: '3 × 15', notes: 'Resistance band' },
          ],
        },
        {
          title: 'Finisher — Core',
          exercises: [
            { name: 'Ab Wheel Rollouts', sets_reps: '3 × 10', notes: 'Slow and controlled' },
            { name: 'TRX Plank Hold', sets_reps: '3 × 30 sec', notes: 'Feet in TRX straps' },
          ],
        },
      ],
    },
    {
      day_number: 2,
      name: 'Tuesday — HIIT Metabolic Circuit',
      type: 'hiit',
      duration: '30–40 min',
      hiit_structure: 'Format: 4 rounds of the circuit below\nWork: 40 seconds ON / 20 seconds REST per exercise\nRound Rest: 90 seconds between full rounds\nWarm-up: 5 min light movement + dynamic stretching',
      hiit_note: 'Light–moderate weight on the clean & press — this is cardio, not a max lift. Push hard on intensity, keep form tight on swings. Cool down 5 min with foam roller and light stretching.',
      sections: [
        {
          title: 'Circuit (6 Moves)',
          exercises: [
            { name: 'Kettlebell Swings', sets_reps: '40 sec on / 20 off', notes: '', is_hiit: true },
            { name: 'TRX Jump Squats', sets_reps: '40 sec on / 20 off', notes: '', is_hiit: true },
            { name: 'Medicine Ball Slams', sets_reps: '40 sec on / 20 off', notes: '', is_hiit: true },
            { name: 'Barbell Clean & Press', sets_reps: '40 sec on / 20 off', notes: '', is_hiit: true },
            { name: 'Band Squat to Row', sets_reps: '40 sec on / 20 off', notes: '', is_hiit: true },
            { name: 'Balance Disc Burpees', sets_reps: '40 sec on / 20 off', notes: '', is_hiit: true },
          ],
        },
      ],
    },
    {
      day_number: 3,
      name: 'Wednesday — Lower Body Strength',
      type: 'lower',
      duration: '55–65 min',
      sections: [
        {
          title: 'Warm-Up — 5 min',
          exercises: [
            { name: 'Hip Circle Mobilization', sets_reps: '2 × 10 each', notes: 'Bodyweight' },
            { name: 'Band Lateral Walks', sets_reps: '2 × 15 steps', notes: 'Resistance band' },
            { name: 'Goblet Squat (light KB)', sets_reps: '2 × 10', notes: 'Deep range of motion' },
          ],
        },
        {
          title: 'Main Work',
          exercises: [
            { name: 'Barbell Back Squat', sets_reps: '4 × 6–8', notes: 'Rest 2 min, full depth' },
            { name: 'Romanian Deadlift (barbell)', sets_reps: '4 × 8–10', notes: 'Feel the hamstrings' },
            { name: 'Dumbbell Walking Lunges', sets_reps: '3 × 12 each leg', notes: 'Use open floor space' },
            { name: 'TRX Single-Leg Squat', sets_reps: '3 × 10 each', notes: 'TRX for assistance' },
            { name: 'Kettlebell Goblet Squat', sets_reps: '3 × 15', notes: 'Pause at bottom 1 sec' },
            { name: 'Standing Calf Raises (barbell)', sets_reps: '4 × 20', notes: 'Slow negative' },
          ],
        },
        {
          title: 'Core + Stability Finisher',
          exercises: [
            { name: 'Balance Disc Single-Leg Stand', sets_reps: '3 × 45 sec each', notes: 'Eyes closed = harder' },
            { name: 'Ab Wheel Rollouts', sets_reps: '3 × 10', notes: 'Core stability' },
          ],
        },
      ],
    },
    {
      day_number: 4,
      name: 'Thursday — Active Recovery',
      type: 'rest',
      duration: 'Optional 20 min',
      rest_content: 'Full rest or active recovery only. Light walk, foam rolling, TRX passive stretching, or yoga. Let your CNS recover before Friday\'s full-body session. Prioritize sleep and protein intake today.',
    },
    {
      day_number: 5,
      name: 'Friday — Full Body Compound Power',
      type: 'full',
      duration: '60–70 min',
      sections: [
        {
          title: 'Warm-Up — 5 min',
          exercises: [
            { name: 'TRX Squat + Row Combo', sets_reps: '2 × 10', notes: 'Full body activation' },
            { name: 'Band Shoulder Pass-Throughs', sets_reps: '2 × 10', notes: 'Mobility' },
            { name: 'Inchworms', sets_reps: '2 × 5', notes: 'Bodyweight' },
          ],
        },
        {
          title: 'Main Compound Lifts (Heavy)',
          exercises: [
            { name: 'Deadlift (barbell)', sets_reps: '5 × 5', notes: 'Heaviest lift of week' },
            { name: 'Barbell Overhead Press', sets_reps: '4 × 6–8', notes: 'Rest 2 min' },
            { name: 'Barbell Row', sets_reps: '4 × 8', notes: 'Supinate grip' },
          ],
        },
        {
          title: 'Accessory Work',
          exercises: [
            { name: "Dumbbell Farmer's Carry", sets_reps: '3 × 40m', notes: 'Heavy as possible' },
            { name: 'TRX Push-Up (feet elevated)', sets_reps: '3 × 12', notes: 'Slow negative' },
            { name: 'Dumbbell Hammer Curls', sets_reps: '3 × 12', notes: 'Superset with triceps' },
            { name: 'Overhead Band Tricep Extension', sets_reps: '3 × 15', notes: 'Superset with curls' },
          ],
        },
        {
          title: 'Core Finisher',
          exercises: [
            { name: 'Medicine Ball Russian Twists', sets_reps: '3 × 20', notes: 'Weighted, slow' },
            { name: 'TRX Pike', sets_reps: '3 × 12', notes: 'Feet in straps, hips high' },
            { name: 'Dead Bug (bodyweight)', sets_reps: '3 × 10 each', notes: 'Lower back protection' },
          ],
        },
      ],
    },
    {
      day_number: 6,
      name: 'Saturday — HIIT Strength Intervals',
      type: 'hiit',
      duration: '35–45 min',
      hiit_structure: 'Format: Every Minute On the Minute (EMOM) — 20 minutes\nAlternating: Odd minutes = Exercise A → Even minutes = Exercise B\nThen: 10-minute Tabata finisher (20 sec on / 10 sec off)',
      hiit_note: "Saturday's session is about max effort in minimum time. Go heavy on the hang cleans — this is your power day. Tabata should leave you gasping. Foam roll for 10 min after and you're done for the week.",
      sections: [
        {
          title: 'EMOM — 20 Minutes',
          exercises: [
            { name: 'A: Barbell Hang Clean (5 reps)', sets_reps: 'Odd minutes — explosive', notes: '', is_hiit: true },
            { name: 'B: TRX Burpee (8 reps)', sets_reps: 'Even minutes — conditioning', notes: '', is_hiit: true },
          ],
        },
        {
          title: 'Tabata Finisher — 10 Minutes',
          exercises: [
            { name: 'Kettlebell Goblet Squat Jumps', sets_reps: '20 sec on / 10 sec off', notes: '', is_hiit: true },
            { name: 'Medicine Ball Chest Throw (wall)', sets_reps: '20 sec on / 10 sec off', notes: '', is_hiit: true },
            { name: 'Band Sprinter Pull', sets_reps: '20 sec on / 10 sec off', notes: '', is_hiit: true },
            { name: 'TRX Mountain Climbers', sets_reps: '20 sec on / 10 sec off', notes: '', is_hiit: true },
          ],
        },
      ],
    },
    {
      day_number: 7,
      name: 'Sunday — Full Rest',
      type: 'rest',
      duration: 'Zero',
      rest_content: "No training. Eat well, hydrate, sleep 8 hours. This is where the gains actually happen — supercompensation requires real rest. Prep your week, plan your lifts, and come back Monday locked in.",
    },
  ],
};
