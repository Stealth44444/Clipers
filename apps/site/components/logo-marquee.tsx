import { siDiscord, siFacebook, siInstagram, siKakaotalk, siNaver, siTiktok, siX, siYoutubeshorts, type SimpleIcon } from 'simple-icons';

// Partner platform marks for the landing carousel: logos only, one neutral colour (Simple Icons, CC0).
// CapCut is not in Simple Icons; add its mark here (rendered as a single-colour mask) once the file is supplied.
const MARKS: { name: string; icon: SimpleIcon }[] = [
  { name: '유튜브 쇼츠', icon: siYoutubeshorts },
  { name: '틱톡', icon: siTiktok },
  { name: '인스타그램', icon: siInstagram },
  { name: '페이스북', icon: siFacebook },
  { name: 'X', icon: siX },
  { name: '네이버', icon: siNaver },
  { name: '카카오톡', icon: siKakaotalk },
  { name: '디스코드', icon: siDiscord },
];

function Mark({ name, icon, hidden }: { name: string; icon: SimpleIcon; hidden?: boolean }) {
  return (
    <li aria-hidden={hidden || undefined} className="cl-marquee__item">
      <svg aria-label={hidden ? undefined : name} fill="currentColor" height="28" role={hidden ? undefined : 'img'} viewBox="0 0 24 24" width="28">
        <path d={icon.path} />
      </svg>
    </li>
  );
}

/** Endless horizontal scroll; the list is rendered twice so the loop is seamless. Pauses on hover. */
export default function LogoMarquee() {
  return (
    <div aria-label="함께하는 플랫폼" className="cl-marquee" role="region">
      <ul className="cl-marquee__track">
        {MARKS.map((mark) => (
          <Mark icon={mark.icon} key={mark.name} name={mark.name} />
        ))}
        {MARKS.map((mark) => (
          <Mark hidden icon={mark.icon} key={`${mark.name}-loop`} name={mark.name} />
        ))}
      </ul>
    </div>
  );
}
