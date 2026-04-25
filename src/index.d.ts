export type HeadingStyle = "atx" | "setext";

export interface HtmlToMarkdownOptions {
  baseUrl?: string;
  headingStyle?: HeadingStyle;
  bullet?: "-" | "*" | "+";
  codeBlockFence?: "```" | "~~~";
  preserveImages?: boolean;
}

export function htmlToMarkdown(html: string, options?: HtmlToMarkdownOptions): string;
export { htmlToMarkdown as convert };
export function htmlToMarkdownTurbo(html: string, options?: HtmlToMarkdownOptions): string;
