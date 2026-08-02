import { createFileRoute } from "@tanstack/react-router";
import { StaticPage } from "@/components/StaticPage";
import html from "@/site/home.html?raw";
import css from "@/site/home.css?raw";
import js from "@/site/home.js?raw";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PIZZARIA DO GORDO — Delivery de Pizza" },
      {
        name: "description",
        content:
          "Combos de pizza com refrigerante 2L, borda recheada grátis e entrega grátis na sua região. Peça agora na Pizzaria do Gordo.",
      },
      { property: "og:title", content: "PIZZARIA DO GORDO — Delivery de Pizza" },
      {
        property: "og:description",
        content: "Combos de pizza com refrigerante 2L, borda recheada grátis e entrega grátis na sua região. Peça agora na Pizzaria do Gordo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <StaticPage html={html} css={css} js={js} />,
});
