'use client';

import { useActionState, useState, useTransition } from 'react';
import { PLATFORMS, platformLabel } from '@clipers/db';
import { Badge, Button, ButtonLink, Card, Field, Input, Select } from '@clipers/ui';
import { addChannel, removeChannel, verifyYouTubeChannel, type ChannelActionState } from './channel-actions';
import { disconnectChannel } from './connection-actions';

export type CreatorChannel = { id: string; platform: string; url: string; verificationCode: string; verifiedAt: string | null; verifiedBy: string | null };

const CONNECT: { platform: string; slug: string; label: string }[] = [
  { platform: 'tiktok', slug: 'tiktok', label: '틱톡 연결' },
  { platform: 'instagram_reels', slug: 'instagram', label: '인스타그램 연결' },
];

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
  const [state, formAction, pending] = useActionState<ChannelActionState, FormData>(addChannel, null);
  const [platform, setPlatform] = useState('');

  return (
    <Card
      description="클립을 올리는 계정을 등록하고 인증해 주세요. 인증한 계정이 있는 플랫폼만 클립을 제출할 수 있고, 캠페인 공개 이후 올린 영상만 정산돼요."
      id="channels"
      title="내 채널"
    >
      {connectable.length > 0 && (
        <div className="cl-stack-tight">
          <p className="cl-meta">틱톡·인스타그램 계정을 연결하면 바로 인증되고, 클립 조회수를 매일 자동으로 가져와요.</p>
          <div className="cl-inline">
            {CONNECT.filter((item) => connectable.includes(item.platform)).map((item) => (
              <ButtonLink href={`/api/oauth/${item.slug}/start`} key={item.slug} size="sm" variant="secondary">
                {item.label}
              </ButtonLink>
            ))}
          </div>
        </div>
      )}
      {connected && (
        <p className={connected.ok ? 'cl-alert cl-tone-brand' : 'cl-alert cl-tone-tomato'} role={connected.ok ? 'status' : 'alert'}>
          {connected.text}
        </p>
      )}
      {channels.length > 0 && (
        <ul className="cl-channel-list">
          {channels.map((channel) => (
            <ChannelRow channel={channel} key={channel.id} />
          ))}
        </ul>
      )}
      <form action={formAction} className="cl-auth__form">
        <div className="cl-form-row">
          <Field htmlFor="channel-platform" label="플랫폼">
            <Select id="channel-platform" name="platform" onChange={(event) => setPlatform(event.target.value)} required value={platform}>
              <option value="">플랫폼 선택</option>
              {PLATFORMS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            hint={platform === 'youtube_shorts' ? 'youtube.com/@핸들 주소를 붙여 넣어 주세요.' : '내 프로필 페이지 주소를 붙여 넣어 주세요.'}
            htmlFor="channel-url"
            label="계정 주소"
          >
            <Input id="channel-url" name="url" placeholder="https://" required type="url" />
          </Field>
        </div>
        {state && (
          <p className={state.ok ? 'cl-alert cl-tone-brand' : 'cl-alert cl-tone-tomato'} role={state.ok ? 'status' : 'alert'}>
            {state.message}
          </p>
        )}
        <div className="cl-inline">
          <Button disabled={pending} type="submit" variant="secondary">
            {pending ? '등록 중…' : '계정 등록'}
          </Button>
        </div>
      </form>
    </Card>
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
