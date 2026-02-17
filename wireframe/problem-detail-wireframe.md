# Individual Problem Page Wireframe

```
+--------------------------------------------------+
| AlgoArena                    Hey, [Username]     |
| [Problems] [Profile] [Admin] [Logout]            |
+--------------------------------------------------+
|                    |                    |        |
|   PROBLEM          |     CODE EDITOR    |  AI    |
|   DESCRIPTION      |                    | CHAT   |
|                    |  [Language: Py/CPP]|        |
|   [Title]          |  +-----------------+        |
|   [Difficulty]     |  |                 |        |
|                    |  |  def solution(): |        |
|   [Description     |  |     pass        |        |
|    text...]        |  |                 |        |
|                    |  +-----------------+        |
|   Examples:        |                    |  [Chat |
|   Input: ...       |  [Run Code] [Submit]       |
|   Output: ...      |                    |  messages|
|                    |                    |  here]  |
+--------------------+--------------------+--------+
| OUTPUT PANEL                                    |
|                                                 |
| Test Results:                                   |
| CASE 1: PASS ✓  Input: [1,2,3]  Expected: 6     |
| CASE 2: FAIL ✗  Input: [4,5,6]  Got: 16         |
|                                                 |
+-------------------------------------------------+
```

## Layout Notes:
- Top navigation bar
- Three-panel horizontal layout:
  - Left: Problem description panel (35% width)
    - Problem title and difficulty
    - Description text
    - Examples with input/output
  - Middle: Code editor panel (flexible width)
    - Language selector dropdown
    - Monaco code editor
    - Run Code and Submit buttons
  - Right: AI chat sidebar (320px width)
    - Chat messages area
    - Input field for questions
- Bottom: Output panel (280px height, resizable)
  - Test case results
  - Execution output
  - Status messages

## Interactive Elements:
- Resizable panels (drag borders)
- Language selector changes code template
- Run Code: executes code against sample tests
- Submit: runs full test suite
- AI Chat: conversational help with code/problem