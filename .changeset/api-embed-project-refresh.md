---
'veysur-api': patch
---

Make a project-wide embed pointer refresh cheap: saving project settings no longer reloads every embedded survey's snapshot data, recomputes the project settings per survey or writes the pointers one by one. It rewrites the pointers only, computes the settings once and writes five at a time.
