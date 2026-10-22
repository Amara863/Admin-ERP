// Standard (default) daily ration per animal – general guideline for Indian desi cows.
// The farm / vet can change these on the Feed & TMR page.
export const FEED_STANDARDS = [
  { plan_name: 'Milking cow', for_category: 'Milking cow', green_fodder_kg: 25, dry_fodder_kg: 6, concentrate_kg: 4, mineral_kg: 0.05,
    water_l: 70, note: 'Give 1 kg extra concentrate for every 2.5 L milk above 8 L per day.' },
  { plan_name: 'Pregnant cow', for_category: 'Pregnant cow', green_fodder_kg: 22, dry_fodder_kg: 6, concentrate_kg: 2.5, mineral_kg: 0.05,
    water_l: 60, note: 'Last 2 months: extra 1–1.5 kg concentrate ("steaming up"). Keep away from wet bedding.' },
  { plan_name: 'Dry cow', for_category: 'Dry cow', green_fodder_kg: 20, dry_fodder_kg: 6, concentrate_kg: 1.5, mineral_kg: 0.04,
    water_l: 50, note: 'Do not overfeed concentrate; keep body condition normal.' },
  { plan_name: 'Heifer', for_category: 'Heifer', green_fodder_kg: 14, dry_fodder_kg: 4, concentrate_kg: 1.5, mineral_kg: 0.03,
    water_l: 35, note: 'Growing animal – mineral mixture daily.' },
  { plan_name: 'Calf', for_category: 'Calf', green_fodder_kg: 4, dry_fodder_kg: 1, concentrate_kg: 0.75, mineral_kg: 0.015,
    water_l: 10, note: 'Up to 3 months: mother\'s milk (10% of body weight) + calf starter.' },
  { plan_name: 'Bull', for_category: 'Bull', green_fodder_kg: 25, dry_fodder_kg: 8, concentrate_kg: 2, mineral_kg: 0.05,
    water_l: 60, note: 'Regular exercise; avoid fat build-up.' },
  { plan_name: 'Sick cow', for_category: 'Sick cow', green_fodder_kg: 15, dry_fodder_kg: 5, concentrate_kg: 1.5, mineral_kg: 0.05,
    water_l: 50, note: 'Soft green fodder, clean water near the animal; follow vet advice.' }
];

// Milk a healthy cow of each breed gives per day on the standard ration (used to judge sheds)
export const BREED_EXPECTED_MILK = { Gir: 10, Sahiwal: 11, Tharparkar: 9, Rathi: 8, Kankrej: 7, Desi: 5 };
