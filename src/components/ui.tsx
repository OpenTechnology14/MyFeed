import * as Dialog from '@radix-ui/react-dialog';
import {
  X,
  Rss,
  Globe2,
  Mail,
  MessageCircle,
  Sparkles,
  Cloud,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { Kind } from '../../shared/model';
export function Button({
  children,
  className = '',
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  return (
    <button type="button" className={`button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export const providerIcons: Record<Kind, LucideIcon> = {
  rss: Rss,
  mastodon: Globe2,
  email: Mail,
  rocket: MessageCircle,
  bluesky: Cloud,
  sample: Sparkles,
  api: Globe2,
  youtube: Video,
};
export function SourceIcon({ kind, small = false }: { kind: Kind; small?: boolean }) {
  const Icon = providerIcons[kind];
  return (
    <span className={`source-icon ${kind} ${small ? 'small' : ''}`}>
      <Icon size={small ? 15 : 21} strokeWidth={1.8} />
    </span>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
  top = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  top?: boolean;
}) {
  const opener = useRef(document.activeElement as HTMLElement | null);
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          onCloseAutoFocus={(event) => {
            if (opener.current?.isConnected) {
              event.preventDefault();
              opener.current.focus();
            }
          }}
          className={`modal ${wide ? 'wide' : ''} ${top ? 'modal-top' : ''}`}
        >
          <div className="modal-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>{subtitle || 'Manage your MyFeed workspace.'}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" className="icon-button" aria-label="Close dialog">
                <X size={18} />
              </Button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {help && <small>{help}</small>}
    </label>
  );
}
export function Toggle({
  disabled = false,
  checked,
  onChange,
  label,
}: {
  disabled?: boolean;
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`toggle ${checked ? 'on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}
