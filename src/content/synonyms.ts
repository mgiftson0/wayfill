/**
 * Synonym dictionary for field matching.
 * Maps canonical profile keys to arrays of synonyms / label patterns.
 * Used by the matcher to score form fields against profile keys.
 */

export type ProfileKey =
  | 'firstName' | 'lastName' | 'fullName'
  | 'email' | 'phone'
  | 'city' | 'state' | 'zip' | 'country' | 'address1' | 'address2'
  | 'linkedin' | 'github' | 'portfolio' | 'website'
  | 'summary' | 'coverLetter'
  | 'eduInstitution' | 'eduDegree' | 'eduField' | 'eduGpa' | 'eduStartDate' | 'eduEndDate'
  | 'expCompany' | 'expTitle' | 'expLocation' | 'expStartDate' | 'expEndDate' | 'expDescription'
  | 'skills' | 'certifications' | 'languages'
  | 'authorized' | 'sponsorshipNow' | 'sponsorshipFuture' | 'visaType' | 'over18' | 'clearance'
  | 'eeoGender' | 'eeoRace' | 'eeoVeteran' | 'eeoDisability'
  | 'previousEmployee' | 'relativesAtCompany' | 'backgroundCheck' | 'drugTest' | 'nonCompete'
  | 'referralSource' | 'interviewAvailability' | 'highestDegree'
  | 'salaryExpected' | 'salaryMin' | 'salaryMax' | 'salaryPeriod'
  | 'availableStart' | 'availableEnd' | 'hoursPerWeek' | 'relocation' | 'workMode' | 'travel'
  | 'jobTitle' | 'desiredRole';

export const SYNONYMS: Record<ProfileKey, string[]> = {
  firstName:          ['first name', 'first', 'given name', 'forename', 'prénom', 'nombre'],
  lastName:           ['last name', 'last', 'surname', 'family name', 'apellido'],
  fullName:           ['full name', 'name', 'your name', 'legal name', 'candidate name'],
  email:              ['email', 'e-mail', 'email address', 'work email', 'contact email'],
  phone:              ['phone', 'telephone', 'mobile', 'cell', 'phone number', 'contact number', 'tel'],
  city:               ['city', 'town', 'municipality', 'locality', 'ciudad'],
  state:              ['state', 'province', 'region', 'state/province'],
  zip:                ['zip', 'zip code', 'postal code', 'postcode', 'code postal'],
  country:            ['country', 'nation', 'country of residence'],
  address1:           ['address', 'street address', 'address line 1', 'mailing address', 'street'],
  address2:           ['address line 2', 'apt', 'suite', 'unit', 'floor', 'apartment'],
  linkedin:           ['linkedin', 'linkedin url', 'linkedin profile', 'linkedin.com'],
  github:             ['github', 'github url', 'github profile', 'github.com'],
  portfolio:          ['portfolio', 'website', 'personal website', 'portfolio url', 'personal site'],
  website:            ['website', 'personal site', 'homepage', 'url', 'web address'],
  summary:            ['summary', 'professional summary', 'bio', 'about', 'tell us about yourself', 'introduce yourself'],
  coverLetter:        ['cover letter', 'letter of interest', 'motivation letter', 'why do you want'],

  eduInstitution:     ['school', 'university', 'college', 'institution', 'alma mater', 'education institution'],
  eduDegree:          ['degree', 'degree type', 'diploma', 'qualification', 'certificate', 'highest degree'],
  eduField:           ['field of study', 'major', 'concentration', 'discipline', 'area of study', 'program'],
  eduGpa:             ['gpa', 'grade point average', 'cumulative gpa', 'grades', 'gpa score'],
  eduStartDate:       ['education start', 'enrollment date', 'start date'],
  eduEndDate:         ['graduation date', 'graduation', 'expected graduation', 'end date', 'completion date'],

  expCompany:         ['company', 'employer', 'organization', 'company name', 'workplace', 'firm'],
  expTitle:           ['job title', 'position', 'title', 'role', 'job position', 'position title'],
  expLocation:        ['work location', 'office location', 'company location'],
  expStartDate:       ['start date', 'employment start', 'from date', 'period start'],
  expEndDate:         ['end date', 'employment end', 'to date', 'period end', 'left date'],
  expDescription:     ['description', 'responsibilities', 'duties', 'job description', 'what did you do'],

  skills:             ['skills', 'technical skills', 'competencies', 'abilities', 'expertise', 'proficiencies'],
  certifications:     ['certifications', 'certificates', 'credentials', 'licenses', 'professional certs'],
  languages:          ['languages', 'spoken languages', 'language proficiency', 'fluency'],

  authorized:         ['authorized to work', 'work authorization', 'eligible to work', 'right to work', 'legally authorized', 'us work authorization', 'legally entitled to work', 'permitted to work', 'employment authorization', 'eligible for employment in the united states'],
  sponsorshipNow:     ['require sponsorship', 'visa sponsorship', 'need sponsorship now', 'currently require', 'sponsorship required', 'require visa support', 'need immigration sponsorship', 'require employer sponsorship', 'sponsorship for employment'],
  sponsorshipFuture:  ['future sponsorship', 'will you require sponsorship', 'sponsorship in the future', 'require sponsorship at any time', 'need sponsorship in the future', 'require visa sponsorship in future'],
  visaType:           ['visa type', 'visa status', 'immigration status', 'work visa', 'current visa', 'work authorization type'],
  over18:             ['18 or older', 'age requirement', 'at least 18', 'legal working age', 'over 18'],
  clearance:          ['security clearance', 'clearance level', 'secret clearance', 'top secret', 'government clearance'],

  eeoGender:          ['gender', 'sex', 'gender identity'],
  eeoRace:            ['race', 'ethnicity', 'racial', 'ethnic background', 'race/ethnicity'],
  eeoVeteran:         ['veteran', 'military', 'veteran status', 'military service', 'protected veteran'],
  eeoDisability:      ['disability', 'disabled', 'disability status', 'section 503'],

  previousEmployee:   ['previous employee', 'former employee', 'worked here before', 'rehire', 'previously employed', 'worked at metlife', 'worked at this company', 'previously employed by', 'previously worked for', 'former contractor', 'employee or contractor'],
  relativesAtCompany: ['relatives', 'family members', 'know anyone', 'referral relationship', 'relative employed', 'family member employed', 'relationship to employee'],
  backgroundCheck:    ['background check', 'criminal background', 'background screening', 'consent to background', 'pre employment screening', 'background investigation'],
  drugTest:           ['drug test', 'drug screening', 'substance test', 'consent to drug', 'drug screen'],
  nonCompete:         ['non-compete', 'non compete', 'restrictive covenant', 'currently bound'],
  referralSource:     ['how did you hear', 'source of referral', 'where did you find', 'how did you find us', 'referred by', 'where did you learn about', 'job source', 'source of application'],
  interviewAvailability: ['interview availability', 'available for interview', 'interview times', 'days times available', 'when are you available', 'availability for interviews', 'interview schedule'],
  highestDegree:      ['highest degree', 'highest level of education', 'highest diploma', 'degree obtained', 'highest degree obtained', 'education level', 'level of education'],

  salaryExpected:     ['expected salary', 'desired salary', 'compensation expectations', 'salary expectations', 'expected compensation'],
  salaryMin:          ['minimum salary', 'salary minimum', 'floor salary', 'lowest acceptable'],
  salaryMax:          ['maximum salary', 'salary maximum', 'top of range'],
  salaryPeriod:       ['pay period', 'compensation type', 'annual/hourly', 'salary basis'],

  availableStart:     ['available from', 'start availability', 'when can you start', 'earliest start date'],
  availableEnd:       ['available until', 'end of availability', 'internship end'],
  hoursPerWeek:       ['hours per week', 'hours/week', 'weekly hours', 'availability hours'],
  relocation:         ['relocation', 'willing to relocate', 'open to relocation', 'can you relocate'],
  workMode:           ['remote', 'hybrid', 'on-site', 'work arrangement', 'work environment', 'work preference'],
  travel:             ['travel', 'travel requirement', 'willing to travel', 'travel percentage'],

  jobTitle:           ['job title', 'position applying for', 'applied position', 'role applying to'],
  desiredRole:        ['desired role', 'desired position', 'target role', 'ideal position'],
};

/** All synonyms flattened for quick lookup */
export const SYNONYM_FLAT: Map<string, ProfileKey> = new Map();
for (const [key, synonyms] of Object.entries(SYNONYMS)) {
  for (const s of synonyms) {
    SYNONYM_FLAT.set(s.toLowerCase(), key as ProfileKey);
  }
}
