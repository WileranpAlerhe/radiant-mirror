import { useEffect, useRef } from "react";

type Props = {
  html: string;
  css: string;
  js?: string;
};

/**
 * Renders an imported static page (markup + stylesheet + vanilla script)
 * exactly as it existed in the original site.
 */
export function StaticPage({ html, css, js }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!js) return;
    const run = () => {
      try {
        // eslint-disable-next-line no-new-func
        new Function(js)();
      } catch (err) {
        console.error(err);
      }
    };
    run();
  }, [js]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
