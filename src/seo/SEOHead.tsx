/**
 * Universal SEO / social-sharing head manager.
 *
 * Rendered near the top of every page. Emits a complete, de-duplicated set of
 * meta tags (SEO + Open Graph + Twitter Cards) plus optional JSON-LD via
 * react-helmet-async, and drops a `data-prerender-ready` sentinel into the body
 * so the build-time prerenderer knows the real content (not the Suspense
 * fallback) has mounted before it captures the HTML.
 */
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import {
  SITE_NAME,
  SITE_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  LOCALE,
  TWITTER_SITE,
} from "./config";
import { absoluteUrl, formatTitle, ogCrop } from "./siteUrl";

type OgType = "website" | "article" | "product" | "profile" | "event" | "video.other";
type TwitterCard = "summary" | "summary_large_image" | "player";

export interface SEOHeadProps {
  /** Page title (without the site-name suffix — it's appended automatically). */
  title: string;
  /** Meta description (≈150–160 chars). */
  description?: string;

  ogTitle?: string;
  ogDescription?: string;
  /** Image path or absolute URL. Falls back to the default branded OG image. */
  ogImage?: string;
  ogImageAlt?: string;
  ogType?: OgType;
  /** Canonical path; defaults to the current pathname. */
  canonicalPath?: string;
  twitterCard?: TwitterCard;
  twitterCreator?: string;

  /** Article metadata (when ogType="article"). */
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];

  /** Schema.org structured data — one object or an array of objects. */
  jsonLd?: object | object[];

  /** When true → robots "noindex, follow" (search results, auth, 404). */
  noIndex?: boolean;
  /** Omit the "— Wergu Yaram" suffix (used on the homepage). */
  bareTitle?: boolean;
}

export function SEOHead({
  title,
  description = SITE_DESCRIPTION,
  ogTitle,
  ogDescription,
  ogImage,
  ogImageAlt,
  ogType = "website",
  canonicalPath,
  twitterCard = "summary_large_image",
  twitterCreator,
  publishedTime,
  modifiedTime,
  author,
  section,
  tags,
  jsonLd,
  noIndex = false,
  bareTitle = false,
}: SEOHeadProps) {
  const { pathname } = useLocation();
  const path = canonicalPath ?? pathname;
  const canonical = absoluteUrl(path);

  const fullTitle = formatTitle(title, !bareTitle);
  const desc = description;
  const image = absoluteUrl(ogCrop(ogImage || DEFAULT_OG_IMAGE));
  const imageAlt = ogImageAlt || title;
  const robots = noIndex ? "noindex, follow" : "index, follow";

  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <>
      <Helmet prioritizeSeoTags>
        {/* SEO fundamentals */}
        <title>{fullTitle}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={canonical} />
        <meta name="robots" content={robots} />

        {/* Open Graph */}
        <meta property="og:type" content={ogType} />
        <meta property="og:title" content={ogTitle || title} />
        <meta property="og:description" content={ogDescription || desc} />
        <meta property="og:url" content={canonical} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:locale" content={LOCALE} />
        <meta property="og:image" content={image} />
        <meta property="og:image:secure_url" content={image} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={imageAlt} />

        {/* Article-specific OG */}
        {ogType === "article" && publishedTime && (
          <meta property="article:published_time" content={publishedTime} />
        )}
        {ogType === "article" && modifiedTime && (
          <meta property="article:modified_time" content={modifiedTime} />
        )}
        {ogType === "article" && author && (
          <meta property="article:author" content={author} />
        )}
        {ogType === "article" && section && (
          <meta property="article:section" content={section} />
        )}
        {ogType === "article" &&
          tags?.map((t) => <meta key={t} property="article:tag" content={t} />)}

        {/* Twitter / X Cards */}
        <meta name="twitter:card" content={twitterCard} />
        <meta name="twitter:site" content={TWITTER_SITE} />
        {twitterCreator && <meta name="twitter:creator" content={twitterCreator} />}
        <meta name="twitter:title" content={ogTitle || title} />
        <meta name="twitter:description" content={ogDescription || desc} />
        <meta name="twitter:image" content={image} />
        <meta name="twitter:image:alt" content={imageAlt} />

        {/* Structured data */}
        {ldArray.map((ld, i) => (
          <script key={i} type="application/ld+json">
            {JSON.stringify(ld)}
          </script>
        ))}
      </Helmet>

      {/* Prerender sentinel — signals real content has mounted. */}
      <div data-prerender-ready hidden />
    </>
  );
}
