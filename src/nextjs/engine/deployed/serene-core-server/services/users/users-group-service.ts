import { PrismaClient } from '@prisma/client'
import { UserGroupMemberModel } from '../../models/users/user-group-member-model'
import { UserGroupModel } from '../../models/users/user-group-model'

export class UsersGroupService {

  // Consts
  clName = 'UsersGroupService'

  // Common group names
  externalUsersGroupName = 'External users group'

  // Models
  userGroupMemberModel = new UserGroupMemberModel()
  userGroupModel = new UserGroupModel()

  // Code
  async verifyGroupMemberByOwner(
          prisma: PrismaClient,
          memberUserProfileId: string,
          ownerUserProfileId: string,
          groupName: string) {

    // Get the UserGroup record
    const userGroup = await
            this.userGroupModel.getByUniqueKey(
              prisma,
              ownerUserProfileId,
              groupName)

    if (userGroup == null) {

      return {
        status: false,
        message: `User group not found: ` + groupName
      }
    }

    // Verify the member is present for the group
    const memberUserGroupMember = await
            this.userGroupMemberModel.getByUniqueKey(
              prisma,
              userGroup.id,
              memberUserProfileId)

    if (memberUserGroupMember == null) {

      return {
        status: false,
        message: `Member: ${memberUserProfileId} not found for group: ` +
                 groupName
      }
    }

    // Verify the admin is present for the group (and is an admin of the group)
    const ownerUserGroupMember = await
            this.userGroupMemberModel.getByUniqueKey(
              prisma,
              userGroup.id,
              ownerUserProfileId)

    if (ownerUserGroupMember == null) {

      return {
        status: false,
        message: `Admin: ${ownerUserProfileId} not found for group: ` +
                 groupName
      }
    }

    if (ownerUserGroupMember.isGroupAdmin === false) {

      return {
        status: false,
        message: `Owner: ${ownerUserProfileId} is not an admin for group: ` +
                 groupName
      }
    }

    // Return OK
    return {
      status: true
    }
  }
}
