/**
 * @file Template renderer port.
 */

export interface TemplateRenderer {
  render(
    key: string,
    locale: string,
    context?: Record<string, unknown>,
  ):
    | Promise<{ subject: string; body: string }>
    | { subject: string; body: string };
}

export type TemplateRendererPort = TemplateRenderer;
