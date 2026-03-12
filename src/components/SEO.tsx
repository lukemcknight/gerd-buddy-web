import { Helmet } from "react-helmet-async";
import { SITE_URL, SITE_NAME, DEFAULT_IMAGE } from "@/config/site";

interface SEOProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  noindex?: boolean;
  section?: string;
  tags?: string[];
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const SEO = ({
  title,
  description,
  path,
  image = DEFAULT_IMAGE,
  type = "website",
  publishedTime,
  modifiedTime,
  author,
  noindex,
  section,
  tags,
  jsonLd,
}: SEOProps) => {
  const url = `${SITE_URL}${path}`;
  const fullTitle = `${title} | ${SITE_NAME}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={url} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {type === "article" && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === "article" && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === "article" && author && (
        <meta property="article:author" content={author} />
      )}
      {type === "article" && section && (
        <meta property="article:section" content={section} />
      )}
      {type === "article" && tags && tags.map((tag) => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}

      {jsonLd && (
        Array.isArray(jsonLd)
          ? jsonLd.map((item, i) => (
              <script key={i} type="application/ld+json">{JSON.stringify(item)}</script>
            ))
          : <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};

export default SEO;
