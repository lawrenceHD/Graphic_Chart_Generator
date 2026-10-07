# BrandForge Studio (Ultra Edition) 🚀

> **Studio de Direction Artistique & Moteur d'Identité de Marque Haute Fidélité**  
> Génération automatique de chartes graphiques complètes, systèmes de marque multi-secteurs et mockups 4K photoréalistes à partir d'un logo et de son univers narratif.

---

## 🌟 Vision & Positionnement

**BrandForge Studio** est conçu selon les normes les plus exigeantes de l'ingénierie logicielle moderne et du design haut de gamme. Ce n'est pas un simple générateur de gabarits génériques : c'est un véritable **système expert de direction artistique**, capable d'analyser en profondeur n'importe quel univers de marque (du luxe à la deeptech), d'en extraire la substantifique moelle esthétique et de délivrer des actifs de production prêts pour l'impression (300 DPI) et le digital (4K UHD).

---

## 📚 Documentation Technique Complète

L'ensemble des spécifications, normes d'ingénierie et critères de validation sont documentés dans le dossier [`docs/`](file:///C:/Users/KURO/Documents/Projects/graphic_chart/docs/) :

| Document | Objet & Périmètre |
| :--- | :--- |
| 📑 [**Cahier des Charges Maître (V3.0)**](file:///C:/Users/KURO/Documents/Projects/graphic_chart/docs/CAHIER_DES_CHARGES.md) | Spécifications fonctionnelles, techniques, modèle de données, normes de sécurité et roadmap complète. |
| 🏗️ [**Architecture Système**](file:///C:/Users/KURO/Documents/Projects/graphic_chart/docs/ARCHITECTURE.md) | Architecture Clean / Hexagonale, flux de données, pipeline 4K & 3D, stack technique. |
| ☕ [**Backend & Rôle Intégral (Spring Boot)**](file:///C:/Users/KURO/Documents/Projects/graphic_chart/docs/BACKEND_AND_USER_MANAGEMENT.md) | Architecture Spring Boot 3 (Java 21), Spring Security 6, gestion utilisateurs, orchestration IA et pipeline graphique. |
| 💎 [**Stack 100% Gratuite & Architecture Solide**](file:///C:/Users/KURO/Documents/Projects/graphic_chart/docs/FREE_STACK_AND_ARCHITECTURE.md) | Liste exhaustive des outils 0€ (Open Source / Free Tier pérenne), arborescence complète et flux de production. |
| 🖥️ [**Studio Workspace Engine**](file:///C:/Users/KURO/Documents/Projects/graphic_chart/docs/STUDIO_WORKSPACE_ENGINE.md) | Multi-projets, Chat Copilote, modification de pages par prompts granulaires (AST) et virtualisation 60 FPS. |
| 🎨 [**UI/UX & Design System**](file:///C:/Users/KURO/Documents/Projects/graphic_chart/docs/UI_UX_DESIGN_SYSTEM.md) | Grille 8pt, palette OKLCH, animations Framer Motion 60 FPS, accessibilité WCAG 2.2 AAA. |
| 🛡️ [**Sécurité & Conformité**](file:///C:/Users/KURO/Documents/Projects/graphic_chart/docs/SECURITY_COMPLIANCE.md) | Hardening OWASP, assainissement SVG (anti-XSS/SSRF), chiffrement, RGPD, rate-limiting. |
| ⚡ [**Scalabilité & Performance**](file:///C:/Users/KURO/Documents/Projects/graphic_chart/docs/SCALABILITY_PERFORMANCE.md) | Core Web Vitals, files d'attente BullMQ/Redis pour les rendus lourds, caching CDN, optimisation mémoire. |
| ✅ [**Critères de Validation (DoD)**](file:///C:/Users/KURO/Documents/Projects/graphic_chart/docs/ACCEPTANCE_CRITERIA.md) | Matrice de tests, points de contrôle stricts avant mise en production par fonctionnalité. |
| 📈 [**Journal de Progression & Roadmap**](file:///C:/Users/KURO/Documents/Projects/graphic_chart/docs/PROGRESS_TRACKER.md) | Suivi d'avancement sprint par sprint, vérification des contraintes techniques et registre des commits. |

---

## 🛠️ Stack Technologique de Référence

```
┌────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                  │
│   Next.js 15 (App Router, Turbopack)  •  React 19  •  TypeScript 5.6    │
│   Tailwind CSS v4  •  shadcn/ui  •  Framer Motion  •  Lucide Icons     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                              BACKEND                                   │
│   Next.js Server Actions / Route Handlers  •  Zod Schema Validation     │
│   Moteur IA Multimodal : Gemini 2.5 / 3 API (Vision + LLM)             │
│   Pipeline Graphique : Sharp  •  Potrace/vtracer  •  Canvas / WebGL    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                        INFRASTRUCTURE & PERSISTANCE                    │
│   PostgreSQL (Supabase/Neon) via Drizzle ORM  •  Redis (Upstash/Cache) │
│   BullMQ (Files d'attente rendus 4K/3D)  •  Cloudflare R2 (Stockage)   │
│   Moteur d'Export : @react-pdf/renderer (Vectoriel 300 DPI)            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🧭 Règle d'Or de Développement
À chaque ajout, modification ou sprint :
1. Consulter les contraintes dans [`docs/ACCEPTANCE_CRITERIA.md`](file:///C:/Users/KURO/Documents/Projects/graphic_chart/docs/ACCEPTANCE_CRITERIA.md).
2. Valider les exigences de sécurité dans [`docs/SECURITY_COMPLIANCE.md`](file:///C:/Users/KURO/Documents/Projects/graphic_chart/docs/SECURITY_COMPLIANCE.md).
3. Mettre à jour l'état d'avancement dans [`docs/PROGRESS_TRACKER.md`](file:///C:/Users/KURO/Documents/Projects/graphic_chart/docs/PROGRESS_TRACKER.md).
