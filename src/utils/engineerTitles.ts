// Engineer titles mapping - update these as needed
export const ENGINEER_TITLES: { [username: string]: string } = {
  'mahents.piwowar': 'Senior Software Engineer',
  'andrew.duncan.contractor': 'Contract Software Engineer',
  'andrew.kovalchuk.contractor': 'Contract Software Engineer',
  'jason.boyett': 'Principal Software Engineer',
  'james.streets': 'Senior Software Engineer',
  'jonathan.sweeney': 'Software Engineer II',
  'pius.businge': 'Software Engineer',
  'rami.syriani': 'Senior Software Engineer',
};

export function getEngineerTitle(username: string): string | null {
  return ENGINEER_TITLES[username] || null;
}