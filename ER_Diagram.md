# Entity Relationship Diagram (Old School Style)

In this diagram:

- **Entities** are represented by **Ovals** `([ ])`.
- **Relationships** are represented by **Diamonds** `{ }`.
- **Attributes** are represented by **Circles** `(( ))`.

```mermaid
flowchart TD
    %% Styling for "Old School" look
    classDef entity fill:#ffffff,stroke:#333,stroke-width:2px;
    classDef relation fill:#ffffff,stroke:#333,stroke-width:2px,shape:diamond;
    classDef attribute fill:#ffffff,stroke:#333,stroke-width:1px,stroke-dasharray: 5 5;

    %% --- ENTITIES ---
    USER([USER]):::entity
    PROBLEM([PROBLEM]):::entity
    SUBMISSION([SUBMISSION]):::entity
    CHAT([CHAT SESSION]):::entity

    %% --- RELATIONSHIPS ---
    Writes{Writes}:::relation
    Receives{Receives}:::relation
    Has{Has}:::relation
    Concerns{Concerns}:::relation

    %% --- ATTRIBUTES ---
    %% User Attributes
    U_ID((id)):::attribute
    U_Name((username)):::attribute
    U_Pass((password)):::attribute

    %% Problem Attributes
    P_ID((id)):::attribute
    P_Slug((slug)):::attribute
    P_Title((title)):::attribute
    P_Diff((difficulty)):::attribute

    %% Submission Attributes
    S_ID((id)):::attribute
    S_Lang((language)):::attribute
    S_Status((status)):::attribute
    S_Code((code)):::attribute

    %% Chat Attributes
    C_ID((id)):::attribute
    C_Hist((history)):::attribute
    C_Time((updated_at)):::attribute

    %% --- CONNECTIONS ---

    %% User -> Attributes
    USER --- U_ID
    USER --- U_Name
    USER --- U_Pass

    %% Problem -> Attributes
    PROBLEM --- P_ID
    PROBLEM --- P_Slug
    PROBLEM --- P_Title
    PROBLEM --- P_Diff

    %% Submission -> Attributes
    SUBMISSION --- S_ID
    SUBMISSION --- S_Lang
    SUBMISSION --- S_Status
    SUBMISSION --- S_Code

    %% Chat -> Attributes
    CHAT --- C_ID
    CHAT --- C_Hist
    CHAT --- C_Time

    %% Relationships
    USER --- Writes --- SUBMISSION
    SUBMISSION --- Receives --- PROBLEM

    USER --- Has --- CHAT
    CHAT --- Concerns --- PROBLEM
```
