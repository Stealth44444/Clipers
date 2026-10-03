import { siteUrl } from './urls';

// Operator details shown in the footer, the about page and the trust guide. The domain is clipers.site (bought
// 2026-10-03); add a contact email once mail for it is set up, and official channel URLs to sameAs as they open
// (they become Organization.sameAs).
export const COMPANY = {
  legalName: '주식회사 오디오닉스',
  representative: '안준성',
  registrationNumber: '544-87-03492',
  address: '경기도 용인시 수지구 풍덕천로129번길 16-5 에이52호(풍덕천동, 선용빌딩)',
  sameAs: [] as string[],
};

/** One @id for the company across every page's structured data. */
export const ORGANIZATION_ID = `${siteUrl('/')}#organization`;
