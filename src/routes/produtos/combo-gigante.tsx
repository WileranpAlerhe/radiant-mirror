import { createFileRoute } from "@tanstack/react-router";
import { StaticPage } from "@/components/StaticPage";
import html from "@/site/combo-gigante.html?raw";
import css from "@/site/combo-gigante.css?raw";
import js from "@/site/combo-gigante.js?raw";

export const Route = createFileRoute("/produtos/combo-gigante")({
  head: () => ({
    meta: [
      { title: "Pizzaria do Gordo — 2 Pizzas GG + 1 Refrigerante 2L" },
      {
        name: "description",
        content: "Combo com 2 pizzas GG meio a meio, refrigerante 2L e borda recheada grátis por R$ 75,90.",
      },
      { property: "og:title", content: "2 Pizzas GG + 1 Refrigerante 2L" },
      { property: "og:description", content: "Combo por R$ 75,90 com borda recheada grátis." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <StaticPage html={html} css={css} js={js} />,
});
