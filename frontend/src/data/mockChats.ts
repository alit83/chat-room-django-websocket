export const ME_ID = 'me'

export type User = {
  id: string
  name: string
  avatar: string
  online?: boolean
}
export type ReadReceipt = { userId: string; readAt: string }

export type Message = {
  id: string | number
  text: string
  senderId: string
  senderName?: string
  senderUsername?: string
  senderFirstName?: string
  senderLastName?: string
  timestamp: number
  room: number
  created_date: string
  updated_date: string
  read?: boolean
  readBy?: ReadReceipt[]
}

export type Chat = {
  id: string
  user: User
  messages: Message[]
  lastMessage: string
  lastMessageAt: number
  unread: number
  typingUsers?: (string | number)[]
  creatorId?: string
}

const now = Date.now()
const min = (n: number) => now - n * 60 * 1000

function msg(
  id: string,
  text: string,
  senderId: string,
  minutesAgo: number,
  room: number,
): Message {
  const ts = min(minutesAgo)
  return {
    id,
    text,
    senderId,
    timestamp: ts,
    room,
    created_date: new Date(ts).toISOString(),
    updated_date: new Date(ts).toISOString(),
  }
}

export const initialChats: Chat[] = [
  {
    id: '1',
    user: { id: 'u1', name: 'Alex Rivera', avatar: 'AR', online: true },
    messages: [
      msg('m1-1', 'Hey! Are we still on for tonight?', 'u1', 120, 1),
      msg('m1-2', 'Yeah, 8pm works for me', ME_ID, 118, 1),
      msg('m1-3', 'Perfect. I booked the table.', 'u1', 115, 1),
      msg('m1-4', 'Awesome, see you there!', ME_ID, 110, 1),
      msg('m1-5', 'Can you bring the docs?', 'u1', 45, 1),
      msg('m1-6', 'Sure, I have them ready', ME_ID, 40, 1),
      msg('m1-7', 'Thanks! Drive safe', 'u1', 5, 1),
    ],
    lastMessage: 'Thanks! Drive safe',
    lastMessageAt: min(5),
    unread: 2,
  },
  {
    id: '2',
    user: { id: 'u2', name: 'Sam Chen', avatar: 'SC', online: true },
    messages: [
      msg('m2-1', 'Did you see the new design?', 'u2', 200, 2),
      msg('m2-2', 'Just opened it — looks clean', ME_ID, 195, 2),
      msg('m2-3', 'Black and red theme is fire', 'u2', 190, 2),
      msg('m2-4', 'Agreed. Matches the brand', ME_ID, 185, 2),
      msg('m2-5', 'Can you review the PR?', 'u2', 60, 2),
      msg('m2-6', 'On it now', ME_ID, 55, 2),
      msg('m2-7', 'Left a few comments', 'u2', 30, 2),
      msg('m2-8', 'Will address them tonight', ME_ID, 25, 2),
    ],
    lastMessage: 'Will address them tonight',
    lastMessageAt: min(25),
    unread: 0,
  },
  {
    id: '3',
    user: { id: 'u3', name: 'Jordan Lee', avatar: 'JL', online: false },
    messages: [
      msg('m3-1', 'Meeting moved to 3pm', 'u3', 300, 3),
      msg('m3-2', 'Got it, thanks for the heads up', ME_ID, 295, 3),
      msg('m3-3', 'Slides are in the shared folder', 'u3', 280, 3),
      msg('m3-4', 'Downloading now', ME_ID, 275, 3),
      msg('m3-5', 'Let me know if anything is missing', 'u3', 150, 3),
    ],
    lastMessage: 'Let me know if anything is missing',
    lastMessageAt: min(150),
    unread: 1,
  },
  {
    id: '4',
    user: { id: 'u4', name: 'Morgan Taylor', avatar: 'MT', online: true },
    messages: [
      msg('m4-1', 'Happy birthday! 🎉', 'u4', 500, 4),
      msg('m4-2', 'Thank you so much!', ME_ID, 498, 4),
      msg('m4-3', 'Party at my place Saturday', 'u4', 480, 4),
      msg('m4-4', 'Count me in', ME_ID, 475, 4),
      msg('m4-5', 'Bring snacks if you can', 'u4', 470, 4),
      msg('m4-6', 'Will do!', ME_ID, 465, 4),
      msg('m4-7', 'Also invite the team?', 'u4', 90, 4),
      msg('m4-8', 'Already sent the group link', ME_ID, 85, 4),
      msg('m4-9', 'You are the best', 'u4', 12, 4),
    ],
    lastMessage: 'You are the best',
    lastMessageAt: min(12),
    unread: 3,
  },
  {
    id: '5',
    user: { id: 'u5', name: 'Casey Brooks', avatar: 'CB', online: false },
    messages: [
      msg('m5-1', 'Invoice #4421 sent', 'u5', 600, 5),
      msg('m5-2', 'Received, processing payment', ME_ID, 590, 5),
      msg('m5-3', 'Should clear by Friday', 'u5', 580, 5),
      msg('m5-4', 'Sounds good', ME_ID, 575, 5),
    ],
    lastMessage: 'Sounds good',
    lastMessageAt: min(575),
    unread: 0,
  },
  {
    id: '6',
    user: { id: 'u6', name: 'Dev Team', avatar: 'DT', online: true },
    messages: [
      msg('m6-1', 'Deploy scheduled for 22:00 UTC', 'u6', 80, 6),
      msg('m6-2', 'Roger. Monitoring dashboards', ME_ID, 75, 6),
      msg('m6-3', 'Staging passed all checks', 'u6', 70, 6),
      msg('m6-4', 'Green light from my side', ME_ID, 65, 6),
      msg('m6-5', 'Remember to tag the release', 'u6', 50, 6),
      msg('m6-6', 'v2.4.0 tag pushed', ME_ID, 48, 6),
      msg('m6-7', 'Nice work everyone', 'u6', 20, 6),
      msg('m6-8', 'Thanks! 🚀', ME_ID, 18, 6),
      msg('m6-9', 'Post-deploy review tomorrow 10am', 'u6', 8, 6),
    ],
    lastMessage: 'Post-deploy review tomorrow 10am',
    lastMessageAt: min(8),
    unread: 1,
  },
]