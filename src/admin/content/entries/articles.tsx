import { makeContentAdmin } from "@/services/admin/contentAdmin";
import type { Article } from "@/types/domain";
import type { ContentEntry } from "../registry";
import { PUBLISHED, TRUST } from "./shared";

export const articlesEntry: ContentEntry<Article> = {
  key: "articles",
  label: "Articles",
  singular: "Article",
  icon: "newspaper",
  admin: makeContentAdmin<Article>({ collection: "articles", idField: "slug", titleField: "title", resourceType: "article" }),
  columns: [
    { key: "category", label: "Catégorie", render: (a) => a.category },
    { key: "type", label: "Type", render: (a) => (a.type === "video" ? "Vidéo" : "Article") },
    { key: "reading", label: "Lecture", render: (a) => `${a.readingMinutes} min` },
  ],
  schema: {
    groups: [
      { title: "Général", fields: [
        { name: "title", label: "Titre", type: "text", required: true },
        { name: "slug", label: "Slug", type: "slug", slugFrom: "title", required: true },
        { name: "category", label: "Catégorie", type: "text" },
        { name: "type", label: "Type", type: "select", options: [{ value: "article", label: "Article" }, { value: "video", label: "Vidéo" }] },
        { name: "readingMinutes", label: "Minutes de lecture", type: "number" },
        { name: "publishedAt", label: "Date de publication", type: "text", placeholder: "2024-01-01" },
        { name: "videoDurationLabel", label: "Durée vidéo (si vidéo)", type: "text" },
        PUBLISHED,
      ] },
      { title: "Présentation", fields: [
        { name: "cover", label: "Image de couverture", type: "image" },
        { name: "excerpt", label: "Extrait", type: "textarea" },
        { name: "author", label: "Auteur", type: "object", fields: [
          { name: "name", label: "Nom", type: "text" },
          { name: "role", label: "Rôle", type: "text" },
        ] },
      ] },
      { title: "Sommaire", fields: [
        { name: "toc", label: "Sommaire", type: "repeatable", itemLabel: "une entrée", fields: [
          { name: "id", label: "Ancre (id)", type: "text" },
          { name: "label", label: "Libellé", type: "text" },
        ] },
      ] },
      { title: "Corps", fields: [
        { name: "body", label: "Sections", type: "repeatable", itemLabel: "une section", fields: [
          { name: "id", label: "Ancre (id)", type: "text" },
          { name: "heading", label: "Titre de section", type: "text", fullWidth: true },
          { name: "paragraphs", label: "Paragraphes", type: "stringArray" },
          { name: "bullets", label: "Puces (optionnel)", type: "stringArray" },
        ] },
      ] },
      { title: "Sources & relations", fields: [
        { name: "sources", label: "Sources", type: "repeatable", itemLabel: "une source", fields: [
          { name: "label", label: "Libellé", type: "text" },
          { name: "org", label: "Organisation", type: "text" },
        ] },
        { name: "relatedArticles", label: "Articles liés (slugs)", type: "stringArray" },
        { name: "relatedMedications", label: "Médicaments liés (slugs)", type: "stringArray" },
      ] },
      { title: "Confiance", fields: [TRUST] },
    ],
  },
  empty: () => ({
    slug: "", title: "", excerpt: "", category: "", cover: "", author: { name: "", role: "" }, readingMinutes: 3,
    publishedAt: "", toc: [], body: [], relatedArticles: [], relatedMedications: [], sources: [], type: "article",
    trust: { verified: false }, published: false,
  }),
  publicHref: (a) => `/articles/${a.slug}`,
};
