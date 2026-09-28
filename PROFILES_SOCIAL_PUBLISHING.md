# Profiles & Social Publishing — implementation contract

Status: active milestone. Do not begin Rooms until this milestone is meaningfully complete.

## Profile
One profile model for students, tutors, educators and course organizers. Public identity includes avatar, display name, username, bio, academic context, role, follower/following counts and published-content counts. Saved content is private by default.

Trust is deliberately split into three independent concepts:
1. Identity verification — confirms who controls the profile.
2. Role/context — student, tutor, educator, course organizer and academic affiliation.
3. Post provenance — what supports a specific medical post.

Identity verification must never imply that every medical claim by the account is verified.

## Publishing
Create is progressive. Start by choosing one type: Free Text, File/PDF, Image, Video, MCQ or Flashcards. Show only fields required by that type, then shared Academic Context, Provenance, Audience and Comment controls.

Provenance values: Original explanation; Lecture-linked; Textbook/guideline/article; Official course material; AI-assisted. Medical teaching/claim posts require provenance details.

Audience: Public; Followers; contextual course audience when available.
Comments: Everyone; Limited; Off.

## Content behavior
All cards share creator identity, academic context, title, provenance and actions. Type-specific body:
- Text: readable excerpt.
- PDF: file preview + pages/metadata.
- Image: accessible image + caption/alt context.
- Video: playable preview + duration.
- MCQ: stem/options; correct answer hidden until attempt; then explanation/source.
- Flashcards: set metadata + Study action; answers hidden until reveal.

Post detail expands source/provenance, comments and type-specific interactions. Explore a later “Discuss this statement” interaction for contextual medical discussion, but do not lock it without UX review.

## Social graph and saves
Following affects the Following feed. Saved Library is private by default. A private save is not a public endorsement signal. Collections remain organizational rather than gamified.

## Analytics
Private creator analytics should emphasize views, opens, saves, MCQ attempts/completion and follower growth. No XP, streaks, rank frames or childish level systems in the new social surfaces.

## Integration notes from current repo
Current repository is flat at the project root for page/component files (for example App.tsx, NoteCard.tsx, UploadNote.tsx). App.tsx currently routes UploadNote and uses LeaderboardProvider. NoteCard currently imports RankFrame, LeaderboardContext and gamification save helpers. Migration should be incremental: add new social surfaces on this development branch, preserve working note flows, then retire rank/gamification dependencies from social cards after replacement behavior is verified.
