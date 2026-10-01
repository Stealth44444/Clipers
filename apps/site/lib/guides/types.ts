export type GuideAudience = 'creator' | 'advertiser';

export type GuideGroup = 'topic' | 'situation' | 'problem' | 'platform' | 'industry' | 'advertiser-problem';

export type GuideSection = {
  heading: string;
  paragraphs: string[];
  list?: string[];
  links?: { label: string; href: string }[];
};

export type Guide = {
  slug: string;
  audience: GuideAudience;
  group: GuideGroup;
  /** The question as people ask it; also the h1. */
  title: string;
  /** Meta description (about 110 characters). */
  description: string;
  /** Two or three sentences an assistant can quote as the answer. */
  answer: string[];
  sections: GuideSection[];
  /** Views to tabulate at the default creator rate (the creator earnings guide only). */
  table?: number[];
  /** FAQ ids from the audience's FAQ (creator → CREATOR_FAQ, advertiser → ADVERTISER_FAQ). */
  faqIds: string[];
  related: string[];
  /** The matching guide for the other audience, linked at the end. */
  counterpart?: string;
  /** Industry guides: preselects the contact form's industry (one of INQUIRY_INDUSTRIES). */
  industry?: string;
  /** ISO date of the last content change (Article dateModified). */
  updated: string;
};
