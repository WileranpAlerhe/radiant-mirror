import { createFileRoute } from "@tanstack/react-router";
import { StaticPage } from "@/components/StaticPage";
import html from "@/site/combo-g.html?raw";
import css from "@/site/combo-g.css?raw";
import js from "@/site/combo-g.js?raw";

export const Route = createFileRoute("/produtos/combo-g")({
  head: () => ({
    meta: [
      { title: "Pizzaria do Gordo — 2 Pizzas G + 1 Refrigerante 2L" },
      {
        name: "description",
        content: "Combo com 2 pizzas G meio a meio, refrigerante 2L e borda recheada grátis.",
      },
      { property: "og:title", content: "2 Pizzas G + 1 Refrigerante 2L" },
      { property: "og:description", content: "Combo promocional com borda recheada grátis." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <StaticPage html={html} css={css} js={js} />,
});
