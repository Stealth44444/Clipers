# 캠페인 중단 · 남은 금액 반환과 이월 · 입금액 불일치 설계

작성 2026-10-02. 약관 제11조(캠페인 종료와 미사용 금액)가 약속하지만 코드에 없는 기능과, 입금액이 안내 금액과 다를 때의 처리를 만든다.

## 1. 회사 결정 (2026-10-02)

| 항목 | 결정 |
|---|---|
| 반환 시 공제 | 없음. 남은 서비스 대금과 그 부가세를 그대로 돌려준다 |
| 남은 금액 처리 | 브랜드가 반환과 다음 캠페인 사용 중에서 고른다 |
| 반환 요청 기한 | 남은 금액이 확정된 날부터 1년. 그 뒤에는 다음 캠페인에만 쓸 수 있다 |
| 입금액 부족 | 차액이 들어올 때까지 캠페인을 공개하지 않는다 |
| 입금액 초과 | 캠페인을 공개하고 초과분을 보낸 계좌로 돌려준다 |

## 2. 지금 코드의 문제

- 브랜드가 캠페인을 중단할 방법이 없다. `paused` 상태는 있지만 아무도 쓰지 않는다.
- 주간 정산(`weeklySettlementRun.ts`)은 캠페인 상태를 보지 않고 승인된 클립을 모두 정산한다. 지금은 종료 사유가 예산 소진뿐이라 문제가 없지만, 중단을 만들면 중단 뒤 조회수까지 정산된다.
- 예산 소진으로 끝난 캠페인도 크리에이터 지급 한도를 원 단위로 버림해서 몇 원이 남는다(예: 예산 1,000,000원 → 사용 999,998원).
- 반환 기록, 브랜드 잔액, 입금액 불일치 처리가 없다.
- 사이트 FAQ와 가이드 3곳(`advertiser-faq.ts`, `guides/advertiser-problem.ts`)이 "상담 문의로 요청하면 환불"이라고 쓴다. '환불'은 Clipers가 브랜드 돈을 맡아 두는 것처럼 읽혀 자기 거래 구조(약관 제3조)와 맞지 않는다.

## 3. 접근 방식

브랜드 잔액 장부를 둔다. 확정된 남은 금액이 장부에 들어가고, 반환과 새 캠페인 사용이 장부에서 빠진다. 캠페인별 남은 금액 행에 상태를 다는 방식은 일부만 쓰거나 여러 캠페인 잔액을 합칠 때 상태가 복잡해지고, 종료 시점에 바로 고르게 하는 방식은 1년 기한을 둘 수 없어서 택하지 않았다.

모든 장부 금액은 **부가세를 뺀 서비스 대금**이다. 부가세는 입금·반환할 때만 `vatOn()`으로 붙인다.

## 4. 데이터

### `campaigns`에 추가
- `stopped_at timestamptz`: 브랜드가 중단한 시각. 예산 소진으로 끝나면 비어 있다.
- `finalized_at timestamptz`: 남은 금액이 확정된 시각.

### `campaign_escrow`에 추가
- `received_amount numeric(12,0) not null default 0`: 운영자가 통장에서 확인한 누적 입금액(부가세 포함).
- `credit_applied numeric(12,0) not null default 0`: 이 캠페인에 쓴 잔액(서비스 대금).

### `brand_balance_entries` (새 표)
| 칸 | 내용 |
|---|---|
| `id` | |
| `brand_id` | |
| `kind` | `leftover`(+), `applied`(−), `refunded`(−) |
| `amount` | 부호 있는 원 단위 정수. `leftover`는 양수, 나머지는 음수 |
| `campaign_id` | `leftover`는 남은 금액이 나온 캠페인, `applied`는 잔액을 쓴 캠페인 |
| `refund_id` | `refunded`일 때 |
| `refundable_until` | `leftover`만. `finalized_at + 1년` |
| `created_at` | |

브랜드는 자기 행만 읽는다. 쓰기는 아래 DB 함수(security definer)만 한다.

### `brand_refunds` (새 표)
| 칸 | 내용 |
|---|---|
| `id`, `brand_id` | |
| `kind` | `leftover`(브랜드가 요청한 잔액 반환), `over_deposit`(초과 입금 반환) |
| `campaign_id` | `over_deposit`일 때 해당 캠페인 |
| `service_amount` | `leftover`만. 반환하는 서비스 대금 |
| `transfer_amount` | 실제 이체할 금액. `leftover`는 `service_amount + vatOn(service_amount)`, `over_deposit`은 초과분 그대로 |
| `bank_code`, `account_number`, `account_holder` | `leftover`만, 요청 당시 사본. `over_deposit`은 보낸 계좌로 돌려주므로 비어 있다 |
| `status` | `requested` → `paid` |
| `requested_at`, `paid_at`, `paid_by` | |

## 5. 흐름

### 5-1. 캠페인 중단
1. 진행 중(`live`)인 캠페인 화면의 '캠페인 중단'을 누르고 확인 창에서 동의한다. 확인 창 문구: 중단하면 바로 마켓에서 내려가고, 지금까지 승인된 클립만 이번 주 조회수까지 정산된 뒤 남은 금액이 확정된다.
2. `stop_campaign(campaign_id)`가 본인 캠페인이고 `live`인지 확인한 뒤 `status = 'closed'`, `stopped_at = now()`로 바꾼다. 같은 거래에서 이 캠페인의 `pending_review` 클립을 반려한다(사유 "광고주가 캠페인을 중단했어요").

### 5-2. 중단된 캠페인의 정산
`settle()`이 클립을 고를 때 다음 순수 함수를 거친다.

```
includeInSettlement(clip, campaign, period):
  stopped_at이 없으면 포함
  clip.reviewed_at > stopped_at 이면 제외          (중단 뒤 승인 — 5-1에서 반려되므로 방어용)
  period.startAt > stopped_at 이면 제외            (중단한 주 다음 주부터)
  그 밖에는 포함
```

### 5-3. 남은 금액 확정
정산 작업의 끝에 다음을 한다.
- 이번 정산으로 예산이 소진돼 닫힌 캠페인: `finalized_at = now()`. 남은 금액은 0으로 본다(장부 행 없음).
- 중단된 캠페인 중 `finalized_at`이 비어 있고 `stopped_at < period.endAt`인 캠페인: 남은 금액 = `total_budget − budgetUsage(...).spent`. 0보다 크면 `leftover` 행을 넣고, `finalized_at`을 채운다. 승인된 클립이 없는 캠페인도 여기서 확정되도록, 클립 목록이 아니라 캠페인 목록으로 찾는다.
- 이 단계는 DB 함수 `finalize_campaign(campaign_id, leftover)` 한 번으로 행 추가와 `finalized_at` 기록을 같이 한다. `finalized_at`이 이미 있으면 아무것도 하지 않는다(재실행 안전).

화면의 사용액 계산(`budgetUsage`)은 예산 소진으로 닫힌 캠페인(`closed`이고 `stopped_at`이 없음)을 사용액 = 예산으로 보여 준다.

### 5-4. 잔액과 반환 가능 금액
순수 함수 `balanceSummary(entries, now)`:

```
balance       = Σ amount
expired       = Σ leftover.amount  where refundable_until <= now
used          = −Σ amount          where kind in (applied, refunded)
nonRefundable = max(0, expired − used)      // 쓴 돈은 기한이 지난 잔액부터 빠진 것으로 본다
refundable    = max(0, balance − nonRefundable)
```

### 5-5. 반환 요청
1. '예산 사용 내역' 화면에 잔액 카드를 둔다: 잔액, 반환 가능 금액, 1년이 지나 다음 캠페인에만 쓸 수 있는 금액.
2. '반환 요청'에서 금액(기본값: 반환 가능 금액 전부), 은행, 계좌번호, 예금주를 넣는다. 예금주는 세금계산서 상호와 같아야 한다는 안내를 붙인다.
3. `request_refund(amount, bank_code, account_number, account_holder)`가 `balanceSummary`와 같은 계산을 SQL로 다시 해서 `amount <= refundable`을 확인한다. 그런 다음 `brand_refunds` 행과 `refunded` 장부 행을 한 거래로 넣는다. 처리 중인 반환 요청은 브랜드당 한 건만 허용한다.
4. 앱 서버가 Slack 운영 알림을 보낸다(`slackNotifier`).
5. 운영자는 '반환' 화면에서 이체할 금액, 계좌, 세금계산서 정보를 보고 이체한다. 그 뒤 '반환 완료'(`mark_refund_paid`)를 누르고, 홈택스에서 수정세금계산서(−서비스 대금)를 발행한다. 화면에 요청 뒤 경과 영업일을 표시한다(약관: 7영업일 이내).

### 5-6. 잔액으로 새 캠페인 시작
1. 입금 안내 카드에 잔액이 있으면 '잔액 사용' 칸을 둔다. 기본값은 `min(잔액, 예산)`이고 0부터 그 값까지 고칠 수 있다.
2. 입금할 금액 = `depositAmount(예산 − 사용할 잔액)`. 세금계산서는 그 금액만큼 발행된다는 문구를 붙인다.
3. '입금했어요'는 `report_deposit(campaign_id, credit_amount)`로 바꾼다. 이 함수가 잔액 확인, `applied` 행 추가, `credit_applied` 기록, `draft → pending_escrow`를 한 거래로 처리한다. 세금계산서 정보 확인 트리거는 그대로 둔다.
4. 잔액으로 예산 전액을 채우면 버튼 문구가 '잔액으로 시작'이 되고, 운영자는 통장 확인 없이 확인만 누른다.

### 5-7. 입금액 불일치
운영자 입금 확인 화면에서 안내 금액(`depositAmount(예산 − credit_applied)`)을 기준으로 처리한다.
- **금액이 맞음**: 지금처럼 '입금 확인'. `received_amount`를 안내 금액으로 채운다.
- **'금액이 달라요'**: 이번에 확인한 금액을 입력하면 `record_deposit(campaign_id, amount)`가 `received_amount`에 더한다. 그 결과에 따라 다음처럼 처리한다.
  - 누적이 안내 금액보다 적음: `pending_escrow`를 유지한다. 브랜드 화면에 "N원이 확인됐어요. 차액 M원을 더 입금해 주세요"가 뜬다.
  - 누적이 안내 금액 이상: 입금 확인 처리로 캠페인이 공개된다. 초과분이 있으면 `brand_refunds`에 `over_deposit` 행이 생긴다. 브랜드 화면에 "초과 입금한 N원은 보낸 계좌로 돌려드려요"가 뜬다.
- 금액 판정은 순수 함수 `classifyDeposit(expected, received)`가 `short | exact | over`와 차액을 돌려준다.

## 6. 화면

| 화면 | 바뀌는 것 |
|---|---|
| 브랜드 캠페인 상세 | 진행 중이면 '캠페인 중단'. 중단 뒤 확정 전이면 "이번 주 정산 뒤 남은 금액이 확정돼요", 확정 뒤면 "남은 N원은 잔액으로 옮겨졌어요". 입금 카드에 잔액 사용 칸, 부족·초과 안내 |
| 브랜드 예산 사용 내역 | 잔액 카드, 반환 요청, 잔액·반환 내역 표 |
| 운영자 입금 확인 | '금액이 달라요', 확인된 누적 금액, 사용한 잔액 표시 |
| 운영자 반환 (새 화면) | 반환 요청과 초과 입금 반환 목록, 경과 영업일, '반환 완료' |

문구는 '환불'이 아니라 '남은 금액 반환'으로 쓴다.

## 7. 약관과 문서

- **제9조**: 다음 세 가지를 추가한다.
  - 입금액이 모자라면 차액이 확인될 때까지 공개하지 않는다.
  - 넘치면 초과분을 영업일 7일 이내에 보낸 계좌로 돌려준다.
  - 잔액을 쓰면 입금액과 세금계산서는 실제 입금분만큼이다.
- **제11조**를 다시 쓴다.
  - 1항: 서비스 대금이 모두 차감되면 종료된다.
  - 2항: 광고주는 서비스 화면에서 중단할 수 있다. 중단 시점까지 승인된 클립에 대해 중단일이 속한 주의 정산까지 차감한다.
  - 3항: 남은 금액은 정산 뒤 확정돼 광고주 잔액이 된다. 광고주는 확정일부터 1년 안에 반환을 요청하거나 다음 캠페인에 쓸 수 있다. 1년이 지난 잔액은 다음 캠페인에만 쓸 수 있다. 🔸 변호사 확인
  - 4항: 반환은 서비스 대금과 그 부가세를 수수료 없이, 요청일부터 영업일 7일 이내에 한다. 회사는 수정세금계산서를 발행한다.
- **사이트 문구**: `advertiser-faq.ts`와 `guides/advertiser-problem.ts`의 "상담 문의로 요청하면 환불"을 "캠페인을 중단하거나 마친 뒤 남은 금액은 반환받거나 다음 캠페인에 쓸 수 있어요"로 고친다.
- **`docs/legal/README.md` 5절**: 이번 결정을 적고, 잠정 결정 표의 '남은 대금 반환' 줄을 갱신한다. 변호사 질문에 다음 두 가지를 추가한다.
  - 잔액(다음 캠페인 이월)이 선불전자지급수단에 해당하는지. 회사 서비스에만 쓸 수 있어 해당하지 않을 것으로 보인다.
  - 1년 뒤 반환을 막는 조항이 약관 공정성에 문제가 없는지.

## 8. 오류와 경계

- 반환 요청은 반환 가능 금액을 넘을 수 없고, 1원 이상이어야 한다. 처리 중인 요청이 있으면 새 요청을 막는다.
- 잔액 사용은 잔액과 예산을 넘을 수 없다. 예산 최소 1,000,000원은 잔액 사용과 관계없이 그대로다.
- `report_deposit`, `request_refund`, `record_deposit`, `finalize_campaign`은 상태 조건을 걸어 같은 요청이 두 번 와도 한 번만 반영한다.
- 잔액을 쓴 뒤 캠페인이 공개되지 않은 채 취소되는 경우는 이번 범위에서 다루지 않는다. 고객센터에서 운영자가 처리한다.

## 9. 테스트

- 순수 함수 단위 테스트(`packages/db`):
  - `balanceSummary`: 기한 전후, 일부 사용, 기한 지난 잔액부터 차감
  - `includeInSettlement`: 중단 전·후 승인, 중단 주와 다음 주
  - 남은 금액 계산: 예산 소진 종료는 0, 중단은 예산 − 사용액
  - `classifyDeposit`: 부족, 일치, 초과
  - 잔액 반영 입금액
- 정산 실행 테스트에 중단된 캠페인을 넣어, 다음 주 조회수가 정산되지 않고 남은 금액이 한 번만 확정되는지 확인한다.
- 마이그레이션의 1년 기한과 코드 상수(`REFUND_WINDOW_DAYS` 등)가 같은지 확인하는 테스트를 기존 `pricing.test.ts` 방식으로 둔다.
