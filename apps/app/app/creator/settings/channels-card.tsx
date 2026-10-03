'use client';

import { useActionState, useState, useTransition } from 'react';
import { Link2 } from 'lucide-react';
import { channelPlatformOf, parseChannelUrl, PLATFORMS, platformLabel, type PlatformValue } from '@clipers/db';
import { Badge, Button, ButtonLink, Card, cx, Field, Input, PlatformIcon, PlatformIcons } from '@clipers/ui';
import { addChannel, removeChannel, verifyYouTubeChannel, type ChannelActionState } from './channel-actions';
import { disconnectChannel } from './connection-actions';

export type CreatorChannel = { id: string; platform: string; url: string; verificationCode: string; verifiedAt: string | null; verifiedBy: string | null };

const CONNECT: { platform: string; slug: string; name: string }[] = [
  { platform: 'tiktok', slug: 'tiktok', name: '틱톡' },
  { platform: 'instagram_reels', slug: 'instagram', name: '인스타그램' },
];

// What an account on each platform is called (platformLabel names the video format: 쇼츠, 릴스).
const ACCOUNT_NAME: Record<PlatformValue, string> = {
  youtube_shorts: '유튜브',
  tiktok: '틱톡',
  instagram_reels: '인스타그램',
  facebook: '페이스북',
  x: 'X',
  naver_clip: '네이버 클립',
  kakao_shorts: '카카오 숏폼',
};

// Results of /api/oauth/{platform}/callback, passed back as ?connect=.
const CONNECT_RESULT: Record<string, { ok: boolean; text: string }> = {
  'tiktok-connected': { ok: true, text: '틱톡 계정을 연결했어요. 이 계정의 클립은 조회수를 자동으로 가져와요.' },
  'instagram-connected': { ok: true, text: '인스타그램 계정을 연결했어요. 이 계정의 릴스는 조회수를 자동으로 가져와요.' },
  taken: { ok: false, text: '다른 크리에이터가 이미 인증한 계정이에요. 본인 계정이라면 운영팀에 문의해 주세요.' },
  cancelled: { ok: false, text: '연결을 취소했어요.' },
  expired: { ok: false, text: '연결 시간이 지났어요. 다시 시도해 주세요.' },
  failed: { ok: false, text: '연결하지 못했어요. 인스타그램은 프로페셔널(비즈니스·크리에이터) 계정만 연결할 수 있어요.' },
  unavailable: { ok: false, text: '지금은 이 플랫폼을 연결할 수 없어요.' },
};

/** Accounts the creator posts clips from. Only clips from a verified account are accepted. */
export default function ChannelsCard({ channels, connectable = [], connectResult }: {
  channels: CreatorChannel[];
  /** Platforms that can be connected through their own login right now (keys configured). */
  connectable?: string[];
  connectResult?: string;
}) {
  const connected = connectResult ? CONNECT_RESULT[connectResult] : undefined;
  const verified = channels.some((channel) => channel.verifiedAt);
  const connectRows = CONNECT.filter((item) => connectable.includes(item.platform));
  const connectedChannels = channels.filter((channel) => channel.verifiedBy === 'oauth');
  // Connected accounts show in the rows above; one whose platform can't be connected right now stays in the list below.
  const otherChannels = channels.filter((channel) => channel.verifiedBy !== 'oauth' || !connectRows.some((item) => item.platform === channel.platform));

  return (
    <Card
      actions={verified ? undefined : <Badge tone="amber">인증 필요</Badge>}
      description="인증한 계정이 있는 플랫폼만 클립을 제출할 수 있고, 캠페인 공개 이후 올린 영상만 정산돼요."
      id="channels"
      title="내 채널"
    >
      <div className="cl-stack-tight">
        {connected && (
          <p className={connected.ok ? 'cl-alert cl-tone-brand' : 'cl-alert cl-tone-tomato'} role={connected.ok ? 'status' : 'alert'}>
            {connected.text}
          </p>
        )}
        {connectRows.length > 0 && (
          <ul className="cl-connect-list">
            {connectRows.map((item) => {
              const accounts = connectedChannels.filter((channel) => channel.platform === item.platform);
              return accounts.length > 0 ? (
                accounts.map((channel) => <ConnectedRow channel={channel} key={channel.id} name={item.name} />)
              ) : (
                <li className="cl-connect" key={item.slug}>
                  <PlatformIcon platform={item.platform} size={36} />
                  <div className="cl-connect__body">
                    <span className="cl-connect__name">{item.name}</span>
                    <span className="cl-meta">연결하면 바로 인증되고, 클립 조회수를 매일 자동으로 가져와요.</span>
                  </div>
                  <ButtonLink href={`/api/oauth/${item.slug}/start`} size="sm" variant="primary">
                    연결하기
                  </ButtonLink>
                </li>
              );
            })}
          </ul>
        )}
        {otherChannels.length > 0 && (
          <ul className="cl-channel-list">
            {otherChannels.map((channel) => (
              <ChannelRow channel={channel} key={channel.id} />
            ))}
          </ul>
        )}
        <AddChannelForm
          afterConnectRows={connectRows.length > 0}
          divided={!!connected || connectRows.length > 0 || otherChannels.length > 0}
          prominent={channels.length === 0}
        />
      </div>
    </Card>
  );
}

/** Registers an account by its profile address. The platform is read from the address, so there is nothing to pick. */
function AddChannelForm({ afterConnectRows, divided, prominent }: {
  /** Shown under the connect rows: the heading says this is for the other platforms. */
  afterConnectRows: boolean;
  /** Something is listed above: draw the dividing line. */
  divided: boolean;
  /** No account yet: registering is the next step, so its button leads. */
  prominent: boolean;
}) {
  const [url, setUrl] = useState('');
  const [state, formAction, pending] = useActionState<ChannelActionState, FormData>(async (previous, form) => {
    const result = await addChannel(previous, form);
    if (result?.ok) setUrl('');
    return result;
  }, null);

  const platform = channelPlatformOf(url);
  const valid = platform !== null && parseChannelUrl(platform, url) !== null;
  const youtube = platform === 'youtube_shorts';
  const hint = !platform ? (
    <span className="cl-inline">
      <PlatformIcons
        label={`등록할 수 있는 플랫폼: ${Object.values(ACCOUNT_NAME).join(', ')}`}
        platforms={PLATFORMS.map((item) => item.value)}
        size="sm"
      />
      프로필 주소를 붙여 넣어 주세요.
    </span>
  ) : valid ? (
    youtube ? (
      '유튜브 채널이에요. 등록한 뒤 채널 설명에 인증 코드를 넣으면 바로 인증돼요.'
    ) : (
      `${ACCOUNT_NAME[platform]} 계정이에요. 등록한 뒤 프로필 소개에 인증 코드를 넣으면 운영팀이 확인해요.`
    )
  ) : youtube ? (
    '유튜브는 youtube.com/@핸들 형식의 채널 주소를 붙여 넣어 주세요.'
  ) : (
    `${ACCOUNT_NAME[platform]} 프로필 페이지 주소를 붙여 넣어 주세요.`
  );

  return (
    <form action={formAction} className={cx('cl-auth__form', divided && 'cl-connect-manual')}>
      {afterConnectRows && (
        <div>
          <h3 className="cl-connect-manual__title">다른 플랫폼은 주소로 등록</h3>
          <p className="cl-meta">프로필 주소를 등록하고 인증 코드를 프로필에 넣으면 인증돼요.</p>
        </div>
      )}
      <Field hint={hint} htmlFor="channel-url" label="계정 주소">
        <div className="cl-field-inline">
          <div className="cl-input-icon">
            {platform ? <PlatformIcon platform={platform} size={20} /> : <Link2 aria-hidden size={16} />}
            <Input
              autoComplete="off"
              id="channel-url"
              name="url"
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://youtube.com/@핸들"
              required
              spellCheck={false}
              type="url"
              value={url}
            />
          </div>
          <Button disabled={pending || !url.trim()} type="submit" variant={prominent ? 'primary' : 'secondary'}>
            {pending ? '등록 중…' : '계정 등록'}
          </Button>
        </div>
      </Field>
      {state && (
        <p className={state.ok ? 'cl-alert cl-tone-brand' : 'cl-alert cl-tone-tomato'} role={state.ok ? 'status' : 'alert'}>
          {state.message}
        </p>
      )}
    </form>
  );
}

/** A platform account connected through its own login: verified, views collected daily. */
function ConnectedRow({ channel, name }: { channel: CreatorChannel; name: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [working, startWorking] = useTransition();
  const handle = channel.url.replace(/\/+$/, '').split('/').pop() ?? channel.url;

  return (
    <li className="cl-connect">
      <PlatformIcon platform={channel.platform} size={36} />
      <div className="cl-connect__body">
        <span className="cl-connect__name">
          {name} <Badge tone="brand">연결됨</Badge>
        </span>
        <a className="cl-link cl-meta" href={channel.url} rel="noreferrer" target="_blank">
          {handle}
        </a>
        {message && (
          <span className="cl-alert cl-tone-tomato" role="alert">
            {message}
          </span>
        )}
      </div>
      <Button
        disabled={working}
        onClick={() =>
          startWorking(async () => {
            const result = await disconnectChannel(channel.id);
            if (!result.ok) setMessage(result.message);
          })
        }
        size="sm"
        variant="secondary"
      >
        {working ? '해제 중…' : '연결 해제'}
      </Button>
    </li>
  );
}

function ChannelRow({ channel }: { channel: CreatorChannel }) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [working, startWorking] = useTransition();
  const youtube = channel.platform === 'youtube_shorts';

  function run(action: (id: string) => Promise<{ ok: boolean; message: string }>) {
    startWorking(async () => {
      const result = await action(channel.id);
      setMessage({ ok: result.ok, text: result.message });
    });
  }

  return (
    <li className="cl-channel">
      <div className="cl-inline">
        <Badge tone={channel.verifiedAt ? 'brand' : 'amber'}>
          {channel.verifiedBy === 'oauth' ? '연결됨' : channel.verifiedAt ? '인증됨' : youtube ? '코드 확인 필요' : '운영팀 확인 대기'}
        </Badge>
        <span>{platformLabel(channel.platform)}</span>
        <a className="cl-link" href={channel.url} rel="noreferrer" target="_blank">
          {channel.url.replace(/^https:\/\//, '')}
        </a>
      </div>
      {!channel.verifiedAt && (
        <>
          <p className="cl-meta">
            {youtube ? '채널 설명' : '프로필 소개'}에 <code>{channel.verificationCode}</code>를 넣고 저장해 주세요.{' '}
            {youtube ? "저장한 뒤 '인증 확인'을 누르면 바로 인증돼요." : '운영팀이 확인하면 인증돼요.'} 인증이 끝나면 코드는 지워도 돼요.
          </p>
          <div className="cl-inline">
            {youtube && (
              <Button disabled={working} onClick={() => run(verifyYouTubeChannel)} size="sm" variant="primary">
                {working ? '확인 중…' : '인증 확인'}
              </Button>
            )}
            <Button disabled={working} onClick={() => run(removeChannel)} size="sm" variant="secondary">
              삭제
            </Button>
          </div>
        </>
      )}
      {channel.verifiedBy === 'oauth' && (
        <div className="cl-inline">
          <Button disabled={working} onClick={() => run(disconnectChannel)} size="sm" variant="secondary">
            {working ? '해제 중…' : '연결 해제'}
          </Button>
        </div>
      )}
      {message && (
        <p className={message.ok ? 'cl-meta' : 'cl-alert cl-tone-tomato'} role={message.ok ? 'status' : 'alert'}>
          {message.text}
        </p>
      )}
    </li>
  );
}
