// Engineer titles mapping - update these as needed
export const ENGINEER_TITLES: { [username: string]: string } = {
  'mahents.piwowar': 'Senior Software Engineer',
  'andrew.duncan.contractor': 'Contract Software Engineer',
  'andrew.kovalchuk.contractor': 'Contract Software Engineer',
  'james.streets': 'Senior Software Engineer',
  'jonathan.sweeney': 'Software Engineer',
  'pius.businge': 'Senior Software Engineer',
  'rami.syriani': 'Software Engineer',
  'jacob.allenwood': 'Senior Staff Software Engineer',
  'jonny.krein': 'Senior Software Engineer',
  'andrew_elliott': 'Senior Software Engineer',
  'birdwell': 'Senior Staff Software Engineer',
  'caleb.hubbs': 'Senior Software Engineer',
  'james.potter.contractor': 'Contract Software Engineer',
  'bryan.montz': 'Principal Software Engineer'
};

export function getEngineerTitle(username: string): string | null {
  return ENGINEER_TITLES[username] || null;
}