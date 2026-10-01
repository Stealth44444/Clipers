export type GuideGroup = 'topic' | 'situation' | 'problem' | 'platform';

export type GuideSection = {
  heading: string;
  paragraphs: string[];
  list?: string[];
  links?: { label: string; href: string }[];
};

export type Guide = {
  slug: string;
  group: GuideGroup;
  /** The question as people ask it; also the h1. */
  title: string;
  /** Meta description (about 110 characters). */
  description: string;
  /** Two or three sentences an assistant can quote as the answer. */
  answer: string[];
  sections: GuideSection[];
  /** Views to tabulate at the default creator rate (the earnings guide only). */
  table?: number[];
  faqIds: string[];
  related: string[];
  /** ISO date of the last content change (Article dateModified). */
  updated: string;
};
