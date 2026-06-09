# MergeSurvivors UI/UX Context Document

**Status:** Draft Design  
**Reference:** [MergeSurvivors UI/UX Draft - Figma](https://figma.com)

---

## Enforced Business Rules

- **S1-BR-001:** User authentication is required for all protected application routes.
- **S1-BR-006:** All user-scoped records must be isolated by owner identity.
- **S1-BR-008:** Ownership enforcement must be implemented server-side (frontend checks are not sufficient).

---

## Navigation Model

- Nav bar positioned at the top of the page
- Users can click on navigation headers to redirect to respective pages

---

## Dashboard Interaction Model

- **Navigation:** Users click on navigation headers to redirect
- **Search:** Users can use the search bar to search for specific job listings
- **Cards:** Users can hover over and click on each job recommendation card to view detailed description and application process

---

## Component Usage Rules

- Use cards for home screen card previews
- Search bar to narrow down job listings
- Navbar to navigate between different pages
- Buttons used to save or apply for jobs (either in job listing card or full page job description)

---

## Spacing & Typography Conventions

### Navigation Bar

- **Position:** Top of the page
- **Item Spacing:** 100px between each item
- **Typography:** Header 4 – 28px, bold

### Page Title

- **Spacing:** 150px from the top, 50px from the navigation bar
- **Typography:** Header 2 – 48px

### Cards

- **Horizontal Spacing:** 400px from each other
- **Vertical Spacing:** 100px under each card
- **Card Header Typography:** Header 3 – 32px, bold
- **Card Description Typography:** Body – 25px

---

## Consistency Rules

- All cards use a consistent 30px border radius
- Buttons use 2 colors:
  - Save button – secondary color
  - Apply button – primary color
- Short mini descriptions for card previews
- Nav links use text-color with underlines
- Active tabs are white, inactive tabs are gray
- Search bar includes default placeholder text

---

## Color Themes

### Light Mode Color Palette

| Color Name | Hex Code | Usage |
|-----------|----------|-------|
| Off-white | #FAFAF7 | Primary background |
| Orange | #FF8C42 | Primary accent |
| Light Orange | #FFB830 | Secondary accent |
| Black | #000000 | Text color |

### Dark Mode Color Palette

| Color Name | Hex Code | Usage |
|-----------|----------|-------|
| Dark Gray | #2A2A2B | Primary background |
| Blue | #4A7FBE | Primary accent |
| Indigo | #6366F1 | Secondary accent |
| Off-white | #F5F5F3 | Text color |

---

## Notes

- The design maintains consistency between light and dark modes
- Color usage follows accessibility guidelines with strong contrast ratios
- Component spacing ensures visual hierarchy and readability
