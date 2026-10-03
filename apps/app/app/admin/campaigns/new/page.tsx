import { Page, PageHeader } from '@clipers/ui';
import { getSession } from '@/lib/session';
import ManagedCampaignForm, { type BrandOption } from './managed-campaign-form';

/** An operator sets up a brand's campaign on contract terms (managed campaign). */
export default async function NewManagedCampaignPage() {
  const { supabase } = await getSession();
  const [{ data: brands }, { data: billing }] = await Promise.all([
    supabase.from('profiles').select('id, display_name').eq('role', 'brand').order('display_name'),
    supabase.from('brand_billing_profiles').select('brand_id, company_name'),
  ]);
  const companies = new Map(((billing ?? []) as { brand_id: string; company_name: string }[]).map((row) => [row.brand_id, row.company_name]));
  const options: BrandOption[] = ((brands ?? []) as { id: string; display_name: string }[]).map((brand) => ({
    id: brand.id,
    label: companies.has(brand.id) ? `${brand.display_name} · ${companies.get(brand.id)}` : brand.display_name,
  }));

  return (
    <Page>
      <PageHeader
        description="계약으로 조건을 정한 캠페인을 브랜드 대신 만들어요. 입금 확인 대기로 만들어지고, 입금 확인 화면에서 확인하면 마켓에 공개돼요. 공개 뒤에는 셀프서브 캠페인과 똑같이 운영돼요."
        title="매니지드 캠페인 만들기"
      />
      <ManagedCampaignForm brands={options} />
    </Page>
  );
}
