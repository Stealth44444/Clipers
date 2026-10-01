import Link from 'next/link';
import { ButtonLink, formatKRW } from '@clipers/ui';
import CampaignCard from '@/components/campaign-card';
import JsonLd from '@/components/json-ld';
import { LandingFaq, SIGN_UP } from '@/components/landing-chrome';
import type { MarketCampaign } from '@/lib/campaigns';
import { ADVERTISER_NOTES, CAVEATS, START_STEPS } from '@/lib/guides/common';
import { RATE, earningsFor } from '@/lib/guides/facts';
import { guideBySlug, guideFaqs, type Guide } from '@/lib/guides';
import { siteUrl } from '@/lib/urls';

// One guide, in a calm reading column: the question, a quotable answer, the body, then a short closing block for its
// audience (creators: caveats, how to start, open campaigns; advertisers: two notes and a contact button), the FAQ,
// a link to the other audience's matching guide and related guides. Everything comes from the guide data; no widgets.

export default function GuideArticle({ guide, campaigns }: { guide: Guide; campaigns: MarketCampaign[] }) {
  const path = `/guides/${guide.slug}`;
  const advertiser = guide.audience === 'advertiser';
  const counterpart = guide.counterpart ? guideBySlug(guide.counterpart) : undefined;
  const contactHref = `/contact?from=${path}${guide.industry ? `&industry=${encodeURIComponent(guide.industry)}` : ''}`;
  return (
    <>
      <article className="cl-guide">
        <p className="cl-guide__crumbs">
          <Link href="/guides">가이드</Link>
        </p>
        <h1 className="cl-guide__title">{guide.title}</h1>
        <p className="cl-guide__updated">
          <time dateTime={guide.updated}>{guide.updated.split('-').join('. ')}.</time> 업데이트
        </p>
        <div className="cl-guide__answer">
          {guide.answer.map((sentence) => (
            <p key={sentence}>{sentence}</p>
          ))}
        </div>

        {guide.table && (
          <table className="cl-guide__table">
            <caption>1천 회당 {RATE} 캠페인 기준</caption>
            <thead>
              <tr>
                <th scope="col">조회수</th>
                <th scope="col">받는 금액</th>
              </tr>
            </thead>
            <tbody>
              {guide.table.map((views) => (
                <tr key={views}>
                  <td>{views.toLocaleString('ko-KR')}회</td>
                  <td>{formatKRW(earningsFor(views))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {guide.sections.map((section) => (
          <section className="cl-guide__section" key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.list && (
              <ul>
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {section.links?.map((link) =>
              link.href.startsWith('/') ? (
                <Link className="cl-link" href={link.href} key={link.href}>
                  {link.label}
                </Link>
              ) : (
                <a className="cl-link" href={link.href} key={link.href} rel="noopener" target="_blank">
                  {link.label}
                </a>
              )
            )}
          </section>
        ))}

        {advertiser ? (
          <section className="cl-guide__section">
            <h2>시작하기 전에</h2>
            <ul>
              {ADVERTISER_NOTES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="cl-guide__actions">
              <ButtonLink href={SIGN_UP} size="lg" variant="primary">
                캠페인 시작하기
              </ButtonLink>
              <ButtonLink href={contactHref} size="lg" variant="secondary">
                상담 문의
              </ButtonLink>
            </div>
          </section>
        ) : (
          <>
            <section className="cl-guide__section">
              <h2>알아둘 점</h2>
              <ul>
                {CAVEATS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
            <section className="cl-guide__section">
              <h2>시작하는 법</h2>
              <ul>
                {START_STEPS.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
              <div className="cl-guide__actions">
                <ButtonLink href={SIGN_UP} size="lg" variant="primary">
                  무료로 시작하기
                </ButtonLink>
                <ButtonLink href="/discover" size="lg" variant="secondary">
                  캠페인 둘러보기
                </ButtonLink>
              </div>
            </section>
          </>
        )}

        {counterpart && (
          <p className="cl-guide__counterpart">
            {advertiser ? '크리에이터라면' : '광고주라면'} <Link href={`/guides/${counterpart.slug}`}>{counterpart.title}</Link>
          </p>
        )}
      </article>

      {!advertiser && campaigns.length > 0 && (
        <section aria-labelledby="guide-campaigns" className="cl-guide-campaigns">
          <h2 id="guide-campaigns">지금 참여할 수 있는 캠페인</h2>
          <div className="cl-guide-campaigns__grid">
            {campaigns.map((campaign) => (
              <CampaignCard campaign={campaign} key={campaign.id} />
            ))}
          </div>
        </section>
      )}

      <LandingFaq compact items={guideFaqs(guide)} path={path} />

      <nav aria-labelledby="guide-related" className="cl-guide cl-guide__related">
        <h2 id="guide-related">함께 보면 좋은 가이드</h2>
        <ul>
          {guide.related.map((slug) => {
            const related = guideBySlug(slug)!;
            return (
              <li key={slug}>
                <Link href={`/guides/${slug}`}>{related.title}</Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: guide.title,
          description: guide.description,
          inLanguage: 'ko-KR',
          datePublished: guide.updated,
          dateModified: guide.updated,
          mainEntityOfPage: siteUrl(path),
          author: { '@type': 'Organization', name: 'Clipers', url: siteUrl('/') },
          publisher: { '@type': 'Organization', name: 'Clipers', url: siteUrl('/') },
        }}
      />
    </>
  );
}
