# MedNote Social — Sharing & Access Review (2026-10-14)

**Status:** UX review candidate. Do not merge into main or deploy before design review, backend authorization, and repository checks. Active milestone remains Profiles & Social Publishing; Rooms is deferred.

## Access contract

Public, Followers, and future course audiences are distinct authorization rules. For Followers-only posts, unauthorized requests must not serialize title, excerpt, file metadata, image/video thumbnails, source/provenance details, embedded MCQ answers, comments, or private counters. Authorize every feed, profile, detail, search, share, and asset endpoint **before** serialization.

Public social unfurl crawlers (Open Graph / Twitter card), bots and search engines are unauthenticated. Their preview for a Followers-only post must be generic: "Followers-only study resource — MedNote". No post-specific title, source, image, description, or metadata. Never place restricted media in publicly cacheable URLs. For authorized in-app views, show full details only after session and follow/context membership checks. A URL is an identifier, not an authorization grant.

A user who loses access after unfollowing must lose detail, media and source access; caches must vary by authorization and use private/no-store for protected responses. Private Saved lists and creator analytics are owner-only. Never expose MCQ answer keys before a server-graded attempt.

## Preview behavior

The local V7 review prototype models:
- Owner / Visitor / Following states and a Followers-only PDF.
- Public link unfurl versus an in-app visitor/follower view.
- A direct-link hash entry point with non-follower default.
- Source inspector and save actions respecting the simulated audience.
- Private Saved, post-type-specific cards, comments, quote-anchored discussion, progressive six-type Create Post.

**Important:** Prototype source contains sample data. Its frontend checks are not security controls. The link it copies is local demo navigation, not a live MedNote URL.

## API acceptance cases

1. Public post is readable anonymously, with only published fields and no hidden MCQ answer key.
2. Followers-only list, detail, Open Graph, search and cache responses reveal no restricted fields to non-followers.
3. Followers-only asset URL is signed, short-lived and reauthorized; leaked static storage keys do not grant access.
4. Following unlocks eligible posts; unfollowing revokes access on the next authorized request.
5. Saved and analytics endpoints reject cross-user access.
6. Comment policy Everyone/Limited/Paused/Off is enforced server-side; quoted anchors are tied to post revision.
7. All six Create Post kinds validate schema, file type, upload rights, patient privacy and source disclosure server-side.
8. Identity badge, credential status, source provenance and medical editorial review remain independent.
9. Test keyboard/RTL/mobile and link unfurl behavior; keep existing /upload and /notes flows intact.

## Repository integration status

The public GitHub repository currently contains a **flattened source export**. App.tsx imports @/pages and @/components, but those directories are absent in this export. Therefore a reliable repository-wide typecheck/build/deploy cannot be claimed from this tree. Root-level Profile.tsx and CreatePost.tsx are review-only components. Do not wire live routes without restoring/locating the actual deployable workspace and running its checks.

## Benchmark — five official references

- LinkedIn creator/profile analytics: https://www.linkedin.com/help/linkedin/answer/a1432215 — creator and audience insights are separate from public identity.
- Reddit followers: https://support.reddithelp.com/hc/en-us/articles/4406644781204-How-do-followers-work-and-how-can-I-opt-in-or-out — following changes home feed distribution and supports opt-out.
- Reddit verification: https://support.reddithelp.com/hc/en-us/articles/42763717293716-Verified-profiles-on-Reddit — identity only; no content endorsement.
- Pinterest private boards: https://help.pinterest.com/en/article/secret-boards — private saves are not public endorsements or public count increments.
- Medium inline responses: https://help.medium.com/hc/en-us/articles/214578008-Write-a-response — quote specific passages in discussion.
- YouTube per-video comments: https://support.google.com/youtube/answer/9483359 — comments may be limited, paused, or off.

## Review gate

Before locking the design, review the profile identity, progressive composer, public-versus-in-app share preview, and restricted-post treatment with the user. No changes to Rooms, Lecture Explainer, Research Mentor, or 3D in this milestone.
