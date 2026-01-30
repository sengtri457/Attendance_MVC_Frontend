# Task Summary: Implement Khmer Language Translation

## Overview
Added a full translation system to support switching between English and Khmer in the Weekly Attendance component.

## Implementation Details

### 1. Language Service (`src/app/services/language.service.ts`)
- Manages the current language state (`en` | `kh`).
- Uses a `signal` for reactive updates.
- Stores a dictionary of translation keys and their values in both languages.
- Persists language preference in `localStorage`.

### 2. Translate Pipe (`src/app/pipes/translate.pipe.ts`)
- A standalone pipe that transforms translation keys into the current language string.
- Impure pipe to react to signal changes immediately.

### 3. Component Updates (`weeklyattendance.component.ts`)
- Injected `LanguageService`.
- Added a language toggle button to the UI header.
- Updated all UI text in the template to use the `translate` pipe.
- Refactored `statusOptions` to use translation keys (PRESENT, ABSENT, etc.).
- Updated logic (alerts, confirmations) to fetch translated strings dynamically using `languageService.getTranslation()`.

## User Experience
- **Toggle Button**: Users can click the button in the header (showing current language name like "ខ្មែរ" or "English") to switch instantly.
- **Comprehensive coverage**: Includes table headers, buttons, labels, status badges, summary cards, and even popup alerts (SweetAlert2).
