// Decision tree based on AmazingRibs' "Salting and Wet Brining" article.
// The author's stance: dry brine almost everything; wet brine is reserved
// for a narrow set of lean, skin-doesn't-matter cuts (salmon, chicken breast,
// turkey breast, pork loin chops). The only "skip" cases are pre-salted meats.
// Curing is its own thing.
//
// Returns one of: 'skip' | 'dry' | 'wet' | 'cure'

export const QUESTIONS = [
  {
    id: 'enhanced',
    label: "Is it labelled enhanced, self-basting, kosher, or already brined?",
    help: "Anything marked “contains up to X% solution,” “self-basting,” “basted,” or kosher has been pre-salted. Brining it again risks oversalting.",
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no',  label: 'No' },
    ],
  },
  {
    id: 'curing',
    label: "Are you making bacon, corned beef, pastrami, or ham?",
    help: "These are cures, not brines — they rely on nitrites and run for days or weeks. This calculator doesn't size them.",
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no',  label: 'No' },
    ],
  },
  {
    id: 'redmeat',
    label: "Is it red meat (beef or lamb)?",
    help: "Wet brining dilutes the flavor of red meat. Dry brine instead — salt on a rack in the fridge, then cook.",
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no',  label: 'No' },
    ],
  },
  {
    id: 'cut',
    label: "Which kind of cut is it?",
    help: "AmazingRibs reserves wet brining for these specific lean cuts. Everything else does fine with a dry brine.",
    options: [
      { value: 'lean',  label: 'Salmon, chicken breast, turkey breast, or pork loin' },
      { value: 'fatty', label: 'Chicken thighs, fattier pork (shoulder, belly), or white flaky fish' },
      { value: 'other', label: 'Something else' },
    ],
  },
  {
    id: 'crispyskin',
    label: "Skin-on, and you want it crispy?",
    help: "Soaking wet skin won't crisp. Dry brining pulls moisture out of the skin so it browns properly.",
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no',  label: 'No' },
      { value: 'na',  label: 'No skin' },
    ],
  },
]

export function recommend(answers) {
  const a = answers || {}
  if (a.curing === 'yes') {
    return {
      method: 'cure',
      title: 'Curing — different beast',
      reason: 'Bacon, corned beef, pastrami, and ham use nitrites and run for days or weeks. Use a dedicated curing recipe with a scale and Cure #1; this calculator only sizes salt for cooking.',
    }
  }
  if (a.enhanced === 'yes') {
    return {
      method: 'skip',
      title: 'Skip the brine',
      reason: 'Enhanced or kosher meat is already pre-salted. Brining it again risks an inedible result.',
    }
  }
  if (a.redmeat === 'yes') {
    return {
      method: 'dry',
      title: 'Dry brine',
      reason: "Wet brining dilutes red-meat flavor. Salt the steak or chop, set it on a rack in the fridge, then cook — better crust and concentrated beefiness.",
    }
  }
  if (a.cut === 'fatty') {
    return {
      method: 'dry',
      title: 'Dry brine',
      reason: "Chicken thighs, fattier pork, and white flaky fish are moist enough on their own that a wet brine is wasted effort. A short dry brine still adds flavor without diluting it.",
    }
  }
  if (a.crispyskin === 'yes') {
    return {
      method: 'dry',
      title: 'Dry brine',
      reason: "Skin can't crisp if it's been soaking. Salt the skin and air-dry uncovered in the fridge — wet brining softens skin and works against you here.",
    }
  }
  if (a.cut === 'lean') {
    return {
      method: 'wet',
      title: 'Wet brine works here',
      reason: "Salmon, chicken or turkey breast, and pork loin are lean enough to dry out fast. Wet brining adds moisture insurance the meat will hold onto. Dry brining also works fine if you'd rather skip the bucket.",
    }
  }
  return {
    method: 'dry',
    title: 'Dry brine',
    reason: "When in doubt, dry brine. The author of the AmazingRibs guide does this for almost everything — steaks, chops, poultry, even many veggies. Simpler than wet, doesn't dilute flavor, and helps skin crisp.",
  }
}
