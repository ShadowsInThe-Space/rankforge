import type {
  SeoIssue,
  IssueSeverity,
  IssueCategory,
  HeadingStructure,
} from "@/types/audit";

// ─── Input Type ──────────────────────────────────────────

export interface AdvancedSeoPageInput {
  url: string;
  html: string | null;
  title: string | null;
  description: string | null;
  h1: string | null;
  wordCount: number | null;
  headings: HeadingStructure | null;
}

// ─── Helper Functions ────────────────────────────────────

function issue(
  type: IssueCategory,
  severity: IssueSeverity,
  page: string,
  message: string,
  fix: string,
): SeoIssue {
  return { type, severity, page, message, fix };
}

// ─── Title Tag Analysis ──────────────────────────────────

export interface TitleAnalysis {
  hasTitle: boolean;
  titleLength: number;
  hasKeyword: boolean;
  keywordPosition: "start" | "middle" | "end" | null;
  isUnique: boolean;
}

function analyzeTitle(
  page: AdvancedSeoPageInput,
  keyword: string,
): TitleAnalysis {
  const title = page.title;
  
  if (!title) {
    return {
      hasTitle: false,
      titleLength: 0,
      hasKeyword: false,
      keywordPosition: null,
      isUnique: true,
    };
  }

  const titleLower = title.toLowerCase();
  const keywordLower = keyword.toLowerCase();
  const hasKeyword = titleLower.includes(keywordLower);
  
  let keywordPosition: "start" | "middle" | "end" | null = null;
  if (hasKeyword) {
    const index = titleLower.indexOf(keywordLower);
    if (index === 0) {
      keywordPosition = "start";
    } else if (index + keyword.length === title.length) {
      keywordPosition = "end";
    } else {
      keywordPosition = "middle";
    }
  }

  return {
    hasTitle: true,
    titleLength: title.length,
    hasKeyword,
    keywordPosition,
    isUnique: true, // Will be set by caller if comparing across pages
  };
}

function checkTitleKeywordPlacement(
  pages: AdvancedSeoPageInput[],
  keyword: string,
): SeoIssue[] {
  const issues: SeoIssue[] = [];
  
  for (const page of pages) {
    const analysis = analyzeTitle(page, keyword);
    
    // Keyword not in title at all
    if (!analysis.hasKeyword) {
      issues.push(
        issue(
          "title",
          "P1",
          page.url,
          `Target keyword "${keyword}" not found in title tag`,
          `Include the target keyword "${keyword}" in your title tag, preferably near the beginning`,
        ),
      );
    }
    // Keyword at the end (less ideal than start)
    else if (analysis.keywordPosition === "end") {
      issues.push(
        issue(
          "title",
          "P2",
          page.url,
          `Keyword "${keyword}" appears at end of title (less prominent)`,
          `Move the keyword closer to the beginning of the title for better SEO impact`,
        ),
      );
    }
    
    // Check title uniqueness across pages
    if (!page.title) {
      issues.push(
        issue(
          "title",
          "P1",
          page.url,
          "Missing title tag",
          "Add a descriptive title tag between 30-60 characters",
        ),
      );
    }
  }
  
  return issues;
}

// ─── Meta Description Analysis ────────────────────────────

export interface MetaDescriptionAnalysis {
  hasDescription: boolean;
  descriptionLength: number;
  hasKeyword: boolean;
  hasCallToAction: boolean;
  lengthScore: number; // 0-100
}

function analyzeMetaDescription(
  page: AdvancedSeoPageInput,
  keyword: string,
): MetaDescriptionAnalysis {
  const desc = page.description;
  
  if (!desc) {
    return {
      hasDescription: false,
      descriptionLength: 0,
      hasKeyword: false,
      hasCallToAction: false,
      lengthScore: 0,
    };
  }

  const descLower = desc.toLowerCase();
  const keywordLower = keyword.toLowerCase();
  
  // Check for CTA patterns
  const ctaPatterns = [
    /learn more/i, /read more/i, /get started/i, /sign up/i,
    /contact us/i, /buy now/i, /shop now/i, /discover more/i,
    /find out/i, /download/i, /try free/i, /request/i,
    /book now/i, /schedule/i, /learn how/i, /see more/i,
  ];
  const hasCallToAction = ctaPatterns.some((pattern) => pattern.test(desc));
  
  // Length scoring (optimal: 120-160 chars)
  let lengthScore = 0;
  const len = desc.length;
  if (len >= 120 && len <= 160) {
    lengthScore = 100;
  } else if (len >= 70 && len < 120) {
    lengthScore = Math.round(((len - 70) / 50) * 100);
  } else if (len > 160 && len <= 200) {
    lengthScore = Math.round(((200 - len) / 40) * 100);
  } else if (len > 200) {
    lengthScore = 0;
  } else {
    lengthScore = Math.round((len / 70) * 100);
  }

  return {
    hasDescription: true,
    descriptionLength: len,
    hasKeyword: descLower.includes(keywordLower),
    hasCallToAction,
    lengthScore,
  };
}

function checkMetaDescriptionQuality(
  pages: AdvancedSeoPageInput[],
  keyword: string,
): SeoIssue[] {
  const issues: SeoIssue[] = [];
  
  for (const page of pages) {
    const analysis = analyzeMetaDescription(page, keyword);
    
    if (!analysis.hasDescription) {
      issues.push(
        issue(
          "meta",
          "P1",
          page.url,
          "Missing meta description",
          "Add a compelling meta description between 120-160 characters",
        ),
      );
      continue;
    }
    
    // Check keyword inclusion
    if (!analysis.hasKeyword) {
      issues.push(
        issue(
          "meta",
          "P2",
          page.url,
          `Target keyword "${keyword}" not found in meta description`,
          `Include the target keyword "${keyword}" in your meta description`,
        ),
      );
    }
    
    // Check for CTA
    if (!analysis.hasCallToAction) {
      issues.push(
        issue(
          "meta",
          "P2",
          page.url,
          "Meta description lacks call-to-action",
          "Add a compelling CTA like 'Learn more', 'Get started', or 'Sign up' to improve CTR",
        ),
      );
    }
    
    // Length warnings
    if (analysis.descriptionLength < 70) {
      issues.push(
        issue(
          "meta",
          "P2",
          page.url,
          `Meta description too short (${analysis.descriptionLength} chars)`,
          "Expand to at least 120 characters for better SERP appearance",
        ),
      );
    } else if (analysis.descriptionLength > 200) {
      issues.push(
        issue(
          "meta",
          "P2",
          page.url,
          `Meta description too long (${analysis.descriptionLength} chars)`,
          "Shorten to under 160 characters to avoid truncation in SERPs",
        ),
      );
    }
  }
  
  return issues;
}

// ─── Performance Checks ───────────────────────────────────

export interface PerformanceAnalysis {
  hasGzip: boolean;
  hasBrotli: boolean;
  totalImages: number;
  imagesWithAlt: number;
  imagesWithoutAlt: number;
  largeImages: number;
  missingFavicon: boolean;
  renderBlockingCss: boolean;
  renderBlockingJs: boolean;
  totalScripts: number;
  inlineScripts: number;
  externalScripts: number;
}

function analyzePerformance(html: string): PerformanceAnalysis {
  // Check for compression headers (these would need server-side data, so we check meta tags as hints)
  const hasGzip = /<meta[^>]*http-equiv\s*=\s*["']?content-encoding["'][^>]*content\s*=\s*["']?gzip["']/i.test(html);
  const hasBrotli = /<meta[^>]*http-equiv\s*=\s*["']?content-encoding["'][^>]*content\s*=\s*["']?br["']/i.test(html);
  
  // Image analysis
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  let imagesWithAlt = 0;
  let imagesWithoutAlt = 0;
  let largeImages = 0;
  
  for (const img of imgTags) {
    const hasAlt = /\salt\s*=\s*["'][^"']+["']/i.test(img) || /\salt\s*=\s*["']\s*["']/i.test(img);
    if (hasAlt) {
      imagesWithAlt++;
    } else {
      imagesWithoutAlt++;
    }
    
    // Check for large image indicators (no width/height or large dimensions)
    const widthMatch = img.match(/\bwidth\s*=\s*["'](\d+)/i);
    const heightMatch = img.match(/\bheight\s*=\s*["'](\d+)/i);
    if (widthMatch || heightMatch) {
      const w = widthMatch ? parseInt(widthMatch[1]) : 0;
      const h = heightMatch ? parseInt(heightMatch[1]) : 0;
      if (w > 1200 || h > 1200) {
        largeImages++;
      }
    } else if (!/\bwidth\b/i.test(img) || !/\bheight\b/i.test(img)) {
      // Missing dimensions could cause layout shift
      largeImages++;
    }
  }
  
  // Favicon check
  const hasFavicon = /<link[^>]*rel\s*=\s*["']?(icon|shortcut icon|apple-touch-icon)[^>]*>/i.test(html);
  
  // Render blocking resources
  const cssInHead = html.match(/<link[^>]*rel\s*=\s*["']?stylesheet["'][^>]*>/gi) || [];
  const jsInHead = html.match(/<script[^>]*src[^>]*>.*?<\/script>/gi) || [];
  const inlineJs = html.match(/<script[^>]*>(?!.*src).*?<\/script>/gi) || [];
  
  // Check if CSS/JS are in head (potentially render-blocking)
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const headContent = headMatch ? headMatch[1] : "";
  const renderBlockingCss = (headContent.match(/<link[^>]*rel\s*=\s*["']?stylesheet["'][^>]*>/gi) || []).length > 0;
  const renderBlockingJs = (headContent.match(/<script[^>]*src[^>]*>.*?<\/script>/gi) || []).length > 0;
  
  return {
    hasGzip,
    hasBrotli,
    totalImages: imgTags.length,
    imagesWithAlt,
    imagesWithoutAlt,
    largeImages,
    missingFavicon: !hasFavicon,
    renderBlockingCss,
    renderBlockingJs,
    totalScripts: jsInHead.length + inlineJs.length,
    inlineScripts: inlineJs.length,
    externalScripts: jsInHead.length,
  };
}

function checkPerformance(pages: AdvancedSeoPageInput[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  
  for (const page of pages) {
    if (!page.html) continue;
    
    const perf = analyzePerformance(page.html);
    
    // Missing favicon
    if (perf.missingFavicon) {
      issues.push(
        issue(
          "performance",
          "P2",
          page.url,
          "Missing favicon",
          "Add a favicon link: <link rel=\"icon\" href=\"/favicon.ico\">",
        ),
      );
    }
    
    // Images without alt text (this is also an accessibility issue)
    if (perf.imagesWithoutAlt > 0) {
      issues.push(
        issue(
          "images",
          "P2",
          page.url,
          `${perf.imagesWithoutAlt} image(s) missing alt text`,
          "Add descriptive alt attributes to all images for accessibility and SEO",
        ),
      );
    }
    
    // Large images without optimization
    if (perf.largeImages > 0) {
      issues.push(
        issue(
          "performance",
          "P2",
          page.url,
          `${perf.largeImages} image(s) may be too large or missing dimensions`,
          "Compress images and add width/height attributes to prevent layout shift",
        ),
      );
    }
    
    // Render blocking CSS
    if (perf.renderBlockingCss) {
      issues.push(
        issue(
          "performance",
          "P2",
          page.url,
          "Render-blocking CSS detected",
          "Consider inlining critical CSS or using media attributes to reduce render blocking",
        ),
      );
    }
    
    // Render blocking JS
    if (perf.renderBlockingJs) {
      issues.push(
        issue(
          "performance",
          "P2",
          page.url,
          "Render-blocking JavaScript detected",
          "Move non-critical JS to footer or use async/defer attributes",
        ),
      );
    }
  }
  
  return issues;
}

// ─── Mobile-Friendliness Detection ─────────────────────────

export interface MobileAnalysis {
  hasViewport: boolean;
  hasTapTargets: number;
  smallTapTargets: number;
  hasFixedPosition: boolean;
  hasHorizontalScroll: boolean;
  fontSizeTooSmall: number;
  viewportWidth: string | null;
}

function analyzeMobile(html: string): MobileAnalysis {
  // Viewport meta tag
  const viewportMatch = html.match(/<meta[^>]*name\s*=\s*["']?viewport["'][^>]*content\s*=\s*["']?([^"']+)["']/i);
  const viewportMatchAlt = html.match(/<meta[^>]*content\s*=\s*["']?([^"']+)["'][^>]*name\s*=\s*["']?viewport["']/i);
  const viewportContent = viewportMatch ? viewportMatch[1] : (viewportMatchAlt ? viewportMatchAlt[1] : null);
  
  const hasViewport = !!viewportContent;
  const viewportWidth = viewportContent ? (viewportContent.match(/width\s*=\s*([^,]+)/i)?.[1] || null) : null;
  
  // Tap targets (links/buttons)
  const tapTargets = html.match(/<a[^>]*>|<button[^>]*>/gi) || [];
  const smallTapTargets = tapTargets.filter(t => {
    // Check for inline styles that might indicate small touch targets
    const hasMinWidth = /\bmin-width\s*:\s*\d{1,3}px/i.test(t);
    const hasMinHeight = /\bmin-height\s*:\s*\d{1,3}px/i.test(t);
    const hasPadding = /\bpadding\s*:\s*\d+/i.test(t);
    return !hasMinWidth && !hasMinHeight && !hasPadding;
  }).length;
  
  // Fixed position (can cause issues on mobile)
  const hasFixedPosition = /position\s*:\s*fixed/i.test(html) || /position\s*:\s*sticky/i.test(html);
  
  // Horizontal scroll indicator (overflow-x)
  const hasHorizontalScroll = /overflow-x\s*:\s*scroll/i.test(html) || /overflow\s*:\s*auto.*horizontal/i.test(html);
  
  // Small font sizes
  const smallFonts = html.match(/font-size\s*:\s*(\d+)px/gi) || [];
  const fontSizeTooSmall = smallFonts.filter(f => {
    const size = parseInt(f.match(/\d+/)?.[0] || "0");
    return size > 0 && size < 12;
  }).length;
  
  return {
    hasViewport,
    hasTapTargets: tapTargets.length,
    smallTapTargets,
    hasFixedPosition,
    hasHorizontalScroll,
    fontSizeTooSmall,
    viewportWidth,
  };
}

function checkMobileFriendliness(pages: AdvancedSeoPageInput[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  
  for (const page of pages) {
    if (!page.html) continue;
    
    const mobile = analyzeMobile(page.html);
    
    // Missing viewport
    if (!mobile.hasViewport) {
      issues.push(
        issue(
          "mobile",
          "P1",
          page.url,
          "Missing viewport meta tag",
          'Add <meta name="viewport" content="width=device-width, initial-scale=1"> for proper mobile rendering',
        ),
      );
    } else {
      // Check for non-responsive viewport settings
      if (mobile.viewportWidth && !mobile.viewportWidth.includes("device-width")) {
        issues.push(
          issue(
            "mobile",
            "P1",
            page.url,
            `Viewport set to fixed width (${mobile.viewportWidth})`,
            "Use 'width=device-width' for responsive design",
          ),
        );
      }
    }
    
    // Fixed position elements
    if (mobile.hasFixedPosition) {
      issues.push(
        issue(
          "mobile",
          "P2",
          page.url,
          "Fixed position elements detected (may cause mobile issues)",
          "Test on mobile devices; consider using sticky positioning or removing fixed elements",
        ),
      );
    }
    
    // Horizontal scroll
    if (mobile.hasHorizontalScroll) {
      issues.push(
        issue(
          "mobile",
          "P2",
          page.url,
          "Potential horizontal scroll on mobile",
          "Ensure all elements fit within viewport width",
        ),
      );
    }
    
    // Small tap targets
    if (mobile.smallTapTargets > 0) {
      issues.push(
        issue(
          "mobile",
          "P2",
          page.url,
          `${mobile.smallTapTargets} tap target(s) may be too small for mobile`,
          "Ensure clickable elements are at least 48x48px for mobile accessibility",
        ),
      );
    }
    
    // Small fonts
    if (mobile.fontSizeTooSmall > 0) {
      issues.push(
        issue(
          "mobile",
          "P2",
          page.url,
          `${mobile.fontSizeTooSmall} font size(s) too small for mobile`,
          "Use font sizes of at least 12px (16px recommended) for readability",
        ),
      );
    }
  }
  
  return issues;
}

// ─── Schema/Structured Data Detection ─────────────────────

export interface SchemaAnalysis {
  hasSchema: boolean;
  schemaTypes: string[];
  schemaCount: number;
  hasOrganization: boolean;
  hasWebsite: boolean;
  hasWebpage: boolean;
  hasBreadcrumb: boolean;
  hasLocalBusiness: boolean;
  hasProduct: boolean;
  hasReview: boolean;
  hasFaq: boolean;
  hasHowTo: boolean;
  hasArticle: boolean;
  hasJsonLd: boolean;
  hasMicrodata: boolean;
}

function analyzeSchema(html: string): SchemaAnalysis {
  // JSON-LD detection
  const jsonLdMatches = html.match(/<script[^>]*type\s*=\s*["']?application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const jsonLdContent = jsonLdMatches.map(m => {
    const match = m.match(/>([\s\S]*?)<\/script>/i);
    return match ? match[1].trim() : "";
  }).filter(Boolean);
  
  // Microdata detection
  const hasMicrodata = /itemscope|itemtype|itemprop/i.test(html);
  
  // Schema types
  const schemaTypes: string[] = [];
  const typePatterns: Array<{ type: string; pattern: RegExp }> = [
    { type: "Organization", pattern: /"@type"\s*:\s*"Organization"/i },
    { type: "WebSite", pattern: /"@type"\s*:\s*"WebSite"/i },
    { type: "WebPage", pattern: /"@type"\s*:\s*"WebPage"/i },
    { type: "BreadcrumbList", pattern: /"@type"\s*:\s*"BreadcrumbList"/i },
    { type: "LocalBusiness", pattern: /"@type"\s*:\s*"LocalBusiness"/i },
    { type: "Product", pattern: /"@type"\s*:\s*"Product"/i },
    { type: "Review", pattern: /"@type"\s*:\s*"Review"/i },
    { type: "FAQPage", pattern: /"@type"\s*:\s*"FAQPage"/i },
    { type: "HowTo", pattern: /"@type"\s*:\s*"HowTo"/i },
    { type: "Article", pattern: /"@type"\s*:\s*"(Article|BlogPosting|NewsArticle)"\b/i },
  ];
  
  for (const { type, pattern } of typePatterns) {
    if (jsonLdContent.some(c => pattern.test(c))) {
      schemaTypes.push(type);
    }
  }
  
  return {
    hasSchema: jsonLdContent.length > 0 || hasMicrodata,
    schemaTypes,
    schemaCount: jsonLdContent.length,
    hasOrganization: schemaTypes.includes("Organization"),
    hasWebsite: schemaTypes.includes("WebSite"),
    hasWebpage: schemaTypes.includes("WebPage"),
    hasBreadcrumb: schemaTypes.includes("BreadcrumbList"),
    hasLocalBusiness: schemaTypes.includes("LocalBusiness"),
    hasProduct: schemaTypes.includes("Product"),
    hasReview: schemaTypes.includes("Review"),
    hasFaq: schemaTypes.includes("FAQPage"),
    hasHowTo: schemaTypes.includes("HowTo"),
    hasArticle: schemaTypes.includes("Article"),
    hasJsonLd: jsonLdContent.length > 0,
    hasMicrodata,
  };
}

function checkSchemaMarkup(pages: AdvancedSeoPageInput[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  
  for (const page of pages) {
    if (!page.html) continue;
    
    const schema = analyzeSchema(page.html);
    
    // No schema at all
    if (!schema.hasSchema) {
      issues.push(
        issue(
          "schema",
          "P2",
          page.url,
          "No structured data (schema.org) found",
          "Add JSON-LD structured data to help search engines understand your content",
        ),
      );
    } else {
      // Check for common missing types based on content type
      const url = page.url.toLowerCase();
      
      // Homepage should have WebSite schema
      if (url.endsWith("/") || url === page.url.split("/").slice(-1)[0]) {
        if (!schema.hasWebsite && !schema.hasOrganization) {
          issues.push(
            issue(
              "schema",
              "P2",
              page.url,
              "Homepage missing WebSite or Organization schema",
              "Add WebSite or Organization schema to your homepage",
            ),
          );
        }
      }
      
      // Product pages should have Product schema
      if (url.includes("/product/") || url.includes("/shop/") || url.includes("/item/")) {
        if (!schema.hasProduct) {
          issues.push(
            issue(
              "schema",
              "P2",
              page.url,
              "Product page missing Product schema",
              "Add Product schema with price, availability, and reviews",
            ),
          );
        }
      }
      
      // Blog posts should have Article schema
      if (url.includes("/blog/") || url.includes("/post/") || url.includes("/article/")) {
        if (!schema.hasArticle) {
          issues.push(
            issue(
              "schema",
              "P2",
              page.url,
              "Blog post missing Article schema",
              "Add Article schema with headline, author, and publish date",
            ),
          );
        }
      }
    }
  }
  
  return issues;
}

// ─── Social Meta Tags (Twitter Cards) ────────────────────

export interface SocialMetaAnalysis {
  hasTwitterCard: boolean;
  hasTwitterSite: boolean;
  hasTwitterCreator: boolean;
  hasTwitterTitle: boolean;
  hasTwitterDescription: boolean;
  hasTwitterImage: boolean;
  hasOgTitle: boolean;
  hasOgDescription: boolean;
  hasOgImage: boolean;
  hasOgUrl: boolean;
  hasOgType: boolean;
  hasOgLocale: boolean;
  twitterCardType: string | null;
}

function analyzeSocialMeta(html: string): SocialMetaAnalysis {
  // Twitter Card tags
  const twitterCard = html.match(/<meta[^>]*name\s*=\s*["']?twitter:card["'][^>]*content\s*=\s*["']?([^"']+)["']/i);
  const twitterSite = html.match(/<meta[^>]*name\s*=\s*["']?twitter:site["'][^>]*content\s*=\s*["']?([^"']+)["']/i);
  const twitterCreator = html.match(/<meta[^>]*name\s*=\s*["']?twitter:creator["'][^>]*content\s*=\s*["']?([^"']+)["']/i);
  const twitterTitle = html.match(/<meta[^>]*name\s*=\s*["']?twitter:title["'][^>]*content\s*=\s*["']?([^"']+)["']/i);
  const twitterDesc = html.match(/<meta[^>]*name\s*=\s*["']?twitter:description["'][^>]*content\s*=\s*["']?([^"']+)["']/i);
  const twitterImage = html.match(/<meta[^>]*name\s*=\s*["']?twitter:image["'][^>]*content\s*=\s*["']?([^"']+)["']/i);
  
  // Open Graph tags
  const ogTitle = html.match(/<meta[^>]*property\s*=\s*["']?og:title["'][^>]*content\s*=\s*["']?([^"']+)["']/i) ||
    html.match(/<meta[^>]*content\s*=\s*["']?([^"']+)["'][^>]*property\s*=\s*["']?og:title["']/i);
  const ogDesc = html.match(/<meta[^>]*property\s*=\s*["']?og:description["'][^>]*content\s*=\s*["']?([^"']+)["']/i) ||
    html.match(/<meta[^>]*content\s*=\s*["']?([^"']+)["'][^>]*property\s*=\s*["']?og:description["']/i);
  const ogImage = html.match(/<meta[^>]*property\s*=\s*["']?og:image["'][^>]*content\s*=\s*["']?([^"']+)["']/i) ||
    html.match(/<meta[^>]*content\s*=\s*["']?([^"']+)["'][^>]*property\s*=\s*["']?og:image["']/i);
  const ogUrl = html.match(/<meta[^>]*property\s*=\s*["']?og:url["'][^>]*content\s*=\s*["']?([^"']+)["']/i) ||
    html.match(/<meta[^>]*content\s*=\s*["']?([^"']+)["'][^>]*property\s*=\s*["']?og:url["']/i);
  const ogType = html.match(/<meta[^>]*property\s*=\s*["']?og:type["'][^>]*content\s*=\s*["']?([^"']+)["']/i) ||
    html.match(/<meta[^>]*content\s*=\s*["']?([^"']+)["'][^>]*property\s*=\s*["']?og:type["']/i);
  const ogLocale = html.match(/<meta[^>]*property\s*=\s*["']?og:locale["'][^>]*content\s*=\s*["']?([^"']+)["']/i) ||
    html.match(/<meta[^>]*content\s*=\s*["']?([^"']+)["'][^>]*property\s*=\s*["']?og:locale["']/i);
  
  return {
    hasTwitterCard: !!twitterCard,
    hasTwitterSite: !!twitterSite,
    hasTwitterCreator: !!twitterCreator,
    hasTwitterTitle: !!twitterTitle,
    hasTwitterDescription: !!twitterDesc,
    hasTwitterImage: !!twitterImage,
    hasOgTitle: !!ogTitle,
    hasOgDescription: !!ogDesc,
    hasOgImage: !!ogImage,
    hasOgUrl: !!ogUrl,
    hasOgType: !!ogType,
    hasOgLocale: !!ogLocale,
    twitterCardType: twitterCard ? twitterCard[1] : null,
  };
}

function checkSocialMeta(pages: AdvancedSeoPageInput[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  
  for (const page of pages) {
    if (!page.html) continue;
    
    const social = analyzeSocialMeta(page.html);
    
    // Twitter Card missing
    if (!social.hasTwitterCard) {
      issues.push(
        issue(
          "twitter",
          "P2",
          page.url,
          "Missing Twitter Card meta tags",
          'Add <meta name="twitter:card" content="summary_large_image"> for better social sharing',
        ),
      );
    } else {
      // Check for Twitter card type
      if (social.twitterCardType === "summary") {
        issues.push(
          issue(
            "twitter",
            "P2",
            page.url,
            "Twitter card type is 'summary' (small image)",
            'Use "summary_large_image" for better engagement on Twitter',
          ),
        );
      }
      
      // Missing Twitter site
      if (!social.hasTwitterSite) {
        issues.push(
          issue(
            "twitter",
            "P2",
            page.url,
            "Missing Twitter site (@username) tag",
            'Add <meta name="twitter:site" content="@yourusername">',
          ),
        );
      }
      
      // Missing Twitter image
      if (!social.hasTwitterImage) {
        issues.push(
          issue(
            "twitter",
            "P2",
            page.url,
            "Missing Twitter image",
            'Add <meta name="twitter:image" content="..."> for better social sharing',
          ),
        );
      }
    }
    
    // Open Graph - only check if not already handled by technical.ts
    // Check for missing og:image (commonly overlooked)
    if (!social.hasOgImage) {
      issues.push(
        issue(
          "og",
          "P2",
          page.url,
          "Missing Open Graph image (og:image)",
          'Add <meta property="og:image" content="..."> for better Facebook/LinkedIn sharing',
        ),
      );
    }
    
    // Missing og:locale
    if (!social.hasOgLocale) {
      issues.push(
        issue(
          "og",
          "P2",
          page.url,
          "Missing Open Graph locale",
          'Add <meta property="og:locale" content="en_US"> for proper locale settings',
        ),
      );
    }
  }
  
  return issues;
}

// ─── Main Analyzer ───────────────────────────────────────

export interface AdvancedSeoAnalysis {
  issues: SeoIssue[];
  stats: {
    totalPages: number;
    pagesWithIssues: number;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  // Per-page analysis data for detailed reporting
  pageAnalysis: Array<{
    url: string;
    title?: TitleAnalysis;
    metaDescription?: MetaDescriptionAnalysis;
    performance?: PerformanceAnalysis;
    mobile?: MobileAnalysis;
    schema?: SchemaAnalysis;
    social?: SocialMetaAnalysis;
  }>;
}

export function analyzeAdvancedSeo(
  pages: AdvancedSeoPageInput[],
  keyword: string = "",
): AdvancedSeoAnalysis {
  const allIssues: SeoIssue[] = [
    // Title keyword placement
    ...checkTitleKeywordPlacement(pages, keyword),
    // Meta description quality
    ...checkMetaDescriptionQuality(pages, keyword),
    // Performance checks
    ...checkPerformance(pages),
    // Mobile-friendliness
    ...checkMobileFriendliness(pages),
    // Schema markup
    ...checkSchemaMarkup(pages),
    // Social meta tags
    ...checkSocialMeta(pages),
  ];

  const pagesWithIssues = new Set(allIssues.map((i) => i.page)).size;

  // Generate per-page analysis data
  const pageAnalysis = pages.map(page => {
    const analysis: AdvancedSeoAnalysis["pageAnalysis"][0] = {
      url: page.url,
    };
    
    if (page.title || keyword) {
      analysis.title = analyzeTitle(page, keyword);
    }
    
    if (page.description || keyword) {
      analysis.metaDescription = analyzeMetaDescription(page, keyword);
    }
    
    if (page.html) {
      analysis.performance = analyzePerformance(page.html);
      analysis.mobile = analyzeMobile(page.html);
      analysis.schema = analyzeSchema(page.html);
      analysis.social = analyzeSocialMeta(page.html);
    }
    
    return analysis;
  });

  return {
    issues: allIssues,
    stats: {
      totalPages: pages.length,
      pagesWithIssues,
      p0Count: allIssues.filter((i) => i.severity === "P0").length,
      p1Count: allIssues.filter((i) => i.severity === "P1").length,
      p2Count: allIssues.filter((i) => i.severity === "P2").length,
    },
    pageAnalysis,
  };
}
