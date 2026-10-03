import { StatusDot } from '@clipers/ui';

/** An auth form error: a red status dot and the message, one sentence per line so no line breaks mid-phrase. */
export default function AuthStatus({ message }: { message: string }) {
  const sentences = message.split(/(?<=[.?!])\s+/);
  return (
    <p className="cl-auth__status" role="alert">
      <StatusDot tone="red">
        <span>
          {sentences.map((sentence) => (
            <span className="cl-auth__status-line" key={sentence}>
              {sentence}
            </span>
          ))}
        </span>
      </StatusDot>
    </p>
  );
}
