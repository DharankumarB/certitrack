/** Demo geography used by the address form. Districts map to taluks; villages are free text. */
export const DISTRICT_TALUKS: Record<string, string[]> = {
  Coimbatore: ['Coimbatore North', 'Coimbatore South', 'Pollachi', 'Mettupalayam'],
  Madurai: ['Madurai North', 'Madurai South', 'Melur', 'Peraiyur'],
  Salem: ['Salem', 'Attur', 'Omalur', 'Mettur'],
  Erode: ['Erode', 'Gobichettipalayam', 'Bhavani', 'Perundurai'],
  Tiruppur: ['Tiruppur North', 'Avinashi', 'Dharapuram', 'Udumalpet'],
  Vellore: ['Vellore', 'Gudiyatham', 'Ambur', 'Katpadi'],
};

export const DISTRICTS = Object.keys(DISTRICT_TALUKS);

export const GENDER_OPTIONS = ['Female', 'Male', 'Other', 'Prefer not to say'];

export const LANGUAGE_OPTIONS: { code: 'en' | 'hi' | 'ta' | 'kn'; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi (हिन्दी)' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
];
