# Zempac Analitika – Design System

Reference document for the visual language used across the **Reportes Zempac** Flutter app.  
Based on the _Lumina Vision Light_ design system exported from Google Stitch.

---

## Typography

| Token                 | Font    | Weight  | Size                                     |
| --------------------- | ------- | ------- | ---------------------------------------- |
| Display / Hero metric | Manrope | 800     | 28–32 sp                                 |
| Title                 | Manrope | 700     | 22–26 sp                                 |
| Card metric           | Manrope | 800     | 16–24 sp                                 |
| Eyebrow label         | Manrope | 700     | 11 sp, letter-spacing 1.0–1.2, uppercase |
| Body                  | Manrope | 400–600 | 12–14 sp                                 |
| Caption / Subtext     | Manrope | 600     | 10–11 sp                                 |

Font loaded via `google_fonts` package. All text uses **Manrope** exclusively.

---

## Color Palette

### Core

| Token              | Hex       | Usage                                         |
| ------------------ | --------- | --------------------------------------------- |
| `primary`          | `#0040DF` | Buttons, active states, links, primary badges |
| `primaryContainer` | `#2D5BFF` | Gradient accent, chart bars                   |
| `onPrimary`        | `#FFFFFF` | Text on primary surfaces                      |

### Secondary

| Token                | Hex       |
| -------------------- | --------- |
| `secondary`          | `#4959A3` |
| `secondaryContainer` | `#9FAFFF` |

### Tertiary (Warning / Devoluciones)

| Token               | Hex       | Usage                             |
| ------------------- | --------- | --------------------------------- |
| `tertiary`          | `#993100` | Devolución badges, negative trend |
| `tertiaryContainer` | `#C24100` |                                   |

### Error

| Token            | Hex       |
| ---------------- | --------- |
| `error`          | `#BA1A1A` |
| `errorContainer` | `#FFDAD6` |

### Surfaces

| Token                     | Hex       | Usage                        |
| ------------------------- | --------- | ---------------------------- |
| `surface`                 | `#F8F9FA` | Page background              |
| `surfaceContainerLowest`  | `#FFFFFF` | Card backgrounds             |
| `surfaceContainerLow`     | `#F3F4F5` | App bar, secondary card fill |
| `surfaceContainer`        | `#EDEEEF` | Borders, progress track      |
| `surfaceContainerHigh`    | `#E7E8E9` |                              |
| `surfaceContainerHighest` | `#E1E3E4` |                              |

### On-Surface

| Token              | Hex       | Usage                             |
| ------------------ | --------- | --------------------------------- |
| `onSurface`        | `#191C1D` | Primary text                      |
| `onSurfaceVariant` | `#434656` | Secondary text, labels            |
| `outline`          | `#747688` | Eyebrow labels, inactive elements |
| `outlineVariant`   | `#C4C5D9` | Input prefix icons                |

---

## Shapes & Radii

| Element        | Radius                   |
| -------------- | ------------------------ |
| Cards          | 16–20 px                 |
| Buttons        | 9999 px (pill)           |
| Chips / Badges | 9999 px (pill)           |
| Input fields   | Defined by theme (12 px) |
| Rank badges    | 10 px                    |
| Progress bars  | 9999 px (fully rounded)  |
| Avatar circles | `BoxShape.circle`        |

---

## Elevation & Shadows

- Cards: No `elevation`. Subtle `BoxShadow` — `Color(0x0A191C1D)`, blur 48, offset (0, 12).
- Login card, app bar, bottom nav: Same shadow recipe.
- Gradient button: Additional colored shadow — `primary.withOpacity(0.2)`, blur 16, offset (0, 6).

---

## Gradients

| Where                   | Colors                         | Direction             |
| ----------------------- | ------------------------------ | --------------------- |
| Hero ventas card        | `primaryContainer` → `primary` | topLeft → bottomRight |
| Login / main CTA button | `primary` → `primaryContainer` | topLeft → bottomRight |

---

## Component Patterns

### Layout

- Page padding: `EdgeInsets.fromLTRB(20, 24, 20, 32)`
- Card internal padding: 20–24 px
- Card gap (vertical): 12–16 px
- Side-by-side cards: `Row` with `Expanded` children, 12 px gap

### Eyebrow Labels

Uppercase, 11 sp, weight 700, letter-spacing 1.0, color `outline` or `primary`.  
Used as section headers above metric cards.

### Metric Display

Large number in Manrope 800. Can receive custom `fontSize` and `color`.

### Trend Badge

Pill-shaped container with arrow icon + percentage text.

- Positive: green background `#E6F4EA`, text `#137333`
- Negative: red background `#FCE8E6`, text `#C5221F`
- Zero/neutral: grey background, grey text

### Cards

- Background: `surfaceContainerLowest` (white)
- Optional subtle border: `surfaceContainer`, 0.5–1 px
- Rounded corners: 16–20 px
- Full-width or half-width (via Row + Expanded)
- Large cards (Margen, Costo, Devoluciones): full-width with richer layout
- Small metric tiles: half-width, stacked label → value → trend → subtext

### Navigation

- Bottom `NavigationBar` with 4 destinations
- Active indicator: `primary` color, white icon
- Labels: uppercase
- Tabs: PRINCIPAL, VENTAS, DEVOLUCIONES, PRODUCTOS

### App Bar

- Custom `ZempacAppBar` (not standard AppBar)
- Background: `surfaceContainerLow`
- Left: hamburger menu icon (opens drawer) + "Zempac Analitika" brand text in `primary`
- Right: optional notification icon, optional avatar

### Drawer

- `ZempacDrawer` with navigation items matching bottom tabs
- "Cerrar Sesión" item at bottom in `tertiary` color
- Navigates to `/login` on logout

### Login Flow

Two-step card-based flow with `AnimatedSwitcher`:

1. **Company step**: company name text field → "Continuar" button
2. **Credentials step**: company badge (tappable to go back) → email → password → login button

---

## Data Screens

| Screen | Model | Key Visuals |
| --- | --- | --- |
| Pantalla Principal | `RptPantallaPrincipal` | Hero ventas card with gradient, paired metric tiles (facturas/ticket, clientes/unidades), full-width productos distintos, margen + costo estimado cards, devoluciones % bar, descuentos |
| Ventas | `List<RptVenta>` | Summary tiles, daily bar chart (fl_chart), detail list per day/almacén |
| Devoluciones | `List<RptDevolucion>` | Summary tiles (total devuelto, count), detail cards with motivo chip + date |
| Productos | `List<RptProductoMasVendido>` | Ranked list with progress bars, margin/facturas chips, relative bar to max |

---

## Dependencies

| Package        | Version | Purpose                             |
| -------------- | ------- | ----------------------------------- |
| `google_fonts` | ^6.2.1  | Manrope typeface                    |
| `fl_chart`     | ^0.70.2 | Bar charts on Ventas screen         |
| `intl`         | ^0.20.2 | Date formatting with Spanish locale |

---

## File Structure (lib/)

```
lib/
├── core/theme/
│   ├── app_colors.dart        # All color tokens
│   └── app_theme.dart         # Material 3 ThemeData
├── models/
│   ├── rpt_pantalla_principal.dart
│   ├── rpt_devolucion.dart
│   ├── rpt_venta.dart
│   └── rpt_producto_mas_vendido.dart
├── services/
│   └── mock_data_service.dart  # Replace with real API calls
├── widgets/
│   ├── zempac_app_bar.dart
│   ├── zempac_drawer.dart
│   └── common_widgets.dart     # EyebrowLabel, MetricDisplay, TrendBadge
├── screens/
│   ├── login/login_screen.dart
│   ├── home/home_shell.dart
│   ├── principal/principal_screen.dart
│   ├── ventas/ventas_screen.dart
│   ├── devoluciones/devoluciones_screen.dart
│   └── productos/productos_screen.dart
└── main.dart
```
