import { createFileRoute } from "@tanstack/react-router";
import { StaticPage } from "@/components/StaticPage";
import html from "@/site/combo-p.html?raw";
import css from "@/site/combo-p.css?raw";
import js from "@/site/combo-p.js?raw";

export const Route = createFileRoute("/produtos/combo-p")({
  head: () => ({
    meta: [
      { title: "Pizzaria do Gordo — 2 Pizzas P + 1 Refrigerante 2L" },
      {
        name: "description",
        content: "Combo com 2 pizzas P meio a meio, refrigerante 2L e borda recheada grátis por R$ 22,90.",
      },
      { property: "og:title", content: "2 Pizzas P + 1 Refrigerante 2L" },
      { property: "og:description", content: "Combo por R$ 22,90 com borda recheada grátis." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <StaticPage html={html} css={css} js={js} />,
});
