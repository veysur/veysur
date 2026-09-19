import { ServerAclRoleAssessorAuthedAdmin } from './AuthedAdmin'
import { ServerAclRoleAssessorParticipant } from './Participant'
import { ServerAclRoleAssessorPreAuth } from './PreAuth'
import { ServerAclRoleAssessorProjectAdmin } from './ProjectAdmin'
import { ServerAclRoleAssessorProjectOwner } from './ProjectOwner'

export const roleAssessors = [
  new ServerAclRoleAssessorAuthedAdmin(),
  new ServerAclRoleAssessorParticipant(),
  new ServerAclRoleAssessorPreAuth(),
  new ServerAclRoleAssessorProjectAdmin(),
  new ServerAclRoleAssessorProjectOwner(),
]

export default roleAssessors
