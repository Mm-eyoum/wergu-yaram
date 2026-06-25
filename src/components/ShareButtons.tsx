/**
 * Social share buttons for any shareable content.
 *
 * On mobile (Web Share API available) a single native "Partager" button opens
 * the OS share sheet; the per-network buttons remain available as a fallback
 * and for desktop. WhatsApp is listed first — it dominates sharing in West
 * Africa, Wergu Yaram's audience.
 */
import { useState } from "react";
import { Facebook, Linkedin, Link2, Mail, MessageCircle, Send, Share2, Twitter, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/useToast";
import { absoluteUrl } from "@/seo/siteUrl";

export interface ShareButtonsProps {
  /** Page path or absolute URL. */
  url: string;
  title: string;
  description?: string;
  hashtags?: string[];
  className?: string;
}

function openPopup(shareUrl: string) {
  window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=560");
}

export function ShareButtons({ url, title, description = "", hashtags = [], className = "" }: ShareButtonsProps) {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [copied, setCopied] = useState(false);

  const link = absoluteUrl(url);
  const eUrl = encodeURIComponent(link);
  const eTitle = encodeURIComponent(title);
  const eDesc = encodeURIComponent(description);
  const eTags = hashtags.map((t) => t.replace(/^#/, "")).join(",");

  const networks = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: <MessageCircle className="h-4 w-4" />,
      href: `https://wa.me/?text=${eTitle}%20${eUrl}`,
    },
    {
      key: "facebook",
      label: "Facebook",
      icon: <Facebook className="h-4 w-4" />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${eUrl}`,
    },
    {
      key: "twitter",
      label: "X",
      icon: <Twitter className="h-4 w-4" />,
      href: `https://twitter.com/intent/tweet?url=${eUrl}&text=${eTitle}${eTags ? `&hashtags=${eTags}` : ""}`,
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      icon: <Linkedin className="h-4 w-4" />,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${eUrl}`,
    },
    {
      key: "telegram",
      label: "Telegram",
      icon: <Send className="h-4 w-4" />,
      href: `https://t.me/share/url?url=${eUrl}&text=${eTitle}`,
    },
    {
      key: "email",
      label: "Email",
      icon: <Mail className="h-4 w-4" />,
      href: `mailto:?subject=${eTitle}&body=${eDesc}%0A%0A${eUrl}`,
    },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      notify(t("share.copied"), "success");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notify(t("share.copyError"), "error");
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, text: description, url: link });
    } catch {
      /* user cancelled — no-op */
    }
  }

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const btn =
    "inline-flex items-center gap-1.5 rounded-xl border border-border-soft px-3 py-1.5 text-sm text-text-secondary transition hover:border-brand-teal hover:text-brand-green";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {canNativeShare && (
        <button type="button" onClick={nativeShare} className={btn} aria-label={t("share.label")}>
          <Share2 className="h-4 w-4" /> {t("share.label")}
        </button>
      )}
      {networks.map((n) => (
        <button
          key={n.key}
          type="button"
          onClick={() => (n.href.startsWith("mailto:") ? (window.location.href = n.href) : openPopup(n.href))}
          className={btn}
          aria-label={t("share.shareOn", { network: n.label })}
          title={n.label}
        >
          {n.icon}
          <span className="hidden sm:inline">{n.label}</span>
        </button>
      ))}
      <button type="button" onClick={copyLink} className={btn} aria-label={t("share.copy")}>
        {copied ? <Check className="h-4 w-4 text-brand-green" /> : <Link2 className="h-4 w-4" />}
        <span className="hidden sm:inline">{copied ? t("share.copiedShort") : t("share.copyShort")}</span>
      </button>
    </div>
  );
}
