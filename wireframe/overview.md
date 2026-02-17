# AlgoArena Frontend Wireframe Overview

## Application Flow

```
Login/Register → Problems List → Problem Detail ↔ Profile/Admin
     ↑              ↓              ↓
     └──────────────┴──────────────┘
```

## Page Structure Overview

### 1. Authentication (Login/Register)
- Centered card with form
- Toggle between login and registration
- Error handling and validation

### 2. Problems Dashboard
- Navigation bar with user info
- Statistics cards (solved, pass rate, activity)
- Search and filter controls
- Problem list with status indicators

### 3. Problem Solving Interface
- Three-panel layout:
  - **Left Panel**: Problem description and examples
  - **Center Panel**: Code editor with language selection
  - **Right Panel**: AI assistant chat
- Bottom panel: Test output and results
- Resizable panels for customization

### 4. User Profile
- Personal statistics and progress
- Submission history
- Activity visualization

### 5. Admin Panel
- Problem creation and management
- AI-powered problem generation
- Testing and validation tools

## Design System
- **Theme**: Dark mode with purple/blue accents
- **Typography**: Inter for UI, Fira Code for code
- **Colors**:
  - Background: Dark blue-gray (#0f111a)
  - Panels: Slightly lighter (#161b22)
  - Accents: Purple (#8b5cf6) and Blue (#3b82f6)
  - Text: Light gray (#e2e8f0) primary, medium gray (#94a3b8) secondary

## Key UI Patterns
- Consistent navigation across all pages
- Card-based layouts for content organization
- Status indicators (✓ solved, ✗ attempted, ○ unsolved)
- Resizable panels for flexible workspace
- Loading states and error handling
- Responsive design considerations