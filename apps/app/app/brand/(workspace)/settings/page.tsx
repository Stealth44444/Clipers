import { Page, PageHeader, Stack } from '@clipers/ui';
import ProfileNameForm from '@/components/profile-name-form';
import { getSession } from '@/lib/session';
import BillingProfileForm from './billing-profile-form';

export default async function BrandSettingsPage() {
  const { supabase, user, profile } = await getSession();
  const { data: billing } = await supabase
    .from('brand_billing_profiles')
    .select('business_number, company_name, representative, invoice_email')
    .eq('brand_id', user.id)
    .maybeSingle();

  return (
    <Page>
      <PageHeader description="브랜드명은 캠페인과 함께 크리에이터에게 보여요." title="설정" />
      <Stack>
        <ProfileNameForm email={user.email ?? ''} initialName={profile.display_name} nameLabel="브랜드명" profileId={profile.id} />
        <BillingProfileForm
          brandId={user.id}
          initial={
            billing
              ? { businessNumber: billing.business_number, companyName: billing.company_name, representative: billing.representative, invoiceEmail: billing.invoice_email }
              : null
          }
        />
      </Stack>
    </Page>
  );
}
