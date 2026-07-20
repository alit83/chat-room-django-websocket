export type ParticipantInfo = { firstName?: string; lastName?: string; username?: string }

type MessageLike = {
  senderId: string
  senderFirstName?: string
  senderLastName?: string
  senderUsername?: string
  senderName?: string
}

export function resolveParticipantName(
  userId: string | number,
  participants: Record<string, ParticipantInfo>,
  fallbackMessages?: MessageLike[],
): string {
  const key = String(userId)
  const info = participants[key]
  if (info) {
    return info.firstName && info.lastName
      ? `${info.firstName} ${info.lastName}`.trim()
      : info.username || 'Someone'
  }
  const fromMessage = fallbackMessages?.find((m) => String(m.senderId) === key)
  if (fromMessage) {
    return fromMessage.senderFirstName && fromMessage.senderLastName
      ? `${fromMessage.senderFirstName} ${fromMessage.senderLastName}`.trim()
      : fromMessage.senderUsername || fromMessage.senderName || 'Someone'
  }
  return 'Someone'
}