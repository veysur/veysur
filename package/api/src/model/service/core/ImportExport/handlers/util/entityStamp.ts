export function entityStamp(userId: string) {
  return {
    createdById: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}
