import { useEffect, useRef } from 'react';
import { renderGoogleButton } from '../cloud';

export default function GoogleButton({ onError }: { onError: (e: Error) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const err = useRef(onError);
  err.current = onError;
  useEffect(() => { if (el.current) renderGoogleButton(el.current, (e) => err.current(e)).catch((e) => err.current(e)); }, []);
  return <div className="google-btn" ref={el} />;
}
