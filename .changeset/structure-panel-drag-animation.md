---
'veysur-app': patch
---

Fix the drag animation in the survey editor structure panel. Items at the drop position were pushed far out of place because a move was applied twice, once by the live reorder and again by the sorting animation. Moves within a group now animate neighbours and apply on drop, the dragged item leaves a dashed placeholder at the drop slot, and the item under the pointer stays visible through a semi-transparent drag preview.
