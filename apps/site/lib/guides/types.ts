export type GuideAudience = 'creator' | 'advertiser';

/** Advertiser groups are listed in question-map order in GUIDE_GROUPS; the order is the stage. */
export type GuideGroup =
  | 'topic'
  | 'situation'
  | 'problem'
  | 'platform'
  | 'pillar'
  | 'advertiser-platform'
  | 'compare'
  | 'cost'
  | 'industry'
  | 'advertiser-problem'
  | 'execution'
  | 'glossary'
  | 'data';

export type GuideSection = {
  heading: string;
  paragraphs: string[];
  list?: string[];
  links?: { label: string; href: string }[];
};

export type GuideSource = { label: string; url: string; checked: string };

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
  /** ISO date the facts were last checked against their sources; shown as "… 확인". */
  reviewed: string;
  /** Primary sources for outside facts. Required for compare and data guides. */
  sources?: GuideSource[];
  /** Named comparisons: what the other service says about itself, each pointing at a source index. */
  claims?: { subject: string; text: string; source: number }[];
  /** Named comparisons stay flagged until a lawyer has read them (the launch checklist lists the false ones). */
  legalReviewed?: boolean;
  /** Glossary only. */
  terms?: { term: string; definition: string }[];
  /** Data pages: one figure per row, each pointing at a source index. */
  rows?: { label: string; value: string; source: number }[];
  /** ISO date of the last content change (Article dateModified). */
  updated: string;
};
