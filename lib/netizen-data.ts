export type NavId = 'feed' | 'videos' | 'messages' | 'notifications' | 'taxis' | 'search' | 'funds' | 'petitions' | 'jobs' | 'groups' | 'profile'

export const stories = [
  { image: '/story-1.png', tag: 'Event', title: 'Local events happening this weekend' },
  { image: '/story-2.png', tag: 'Community', title: 'Community projects making a difference' },
  { image: '/story-1.png', tag: 'Update', title: 'Community garden day highlights' },
  { image: '/story-2.png', tag: 'Event', title: 'Weekend farmers market guide' },
]

export const groups = [
  { image: '/group-1.png', name: 'Community Group', members: '20.3k members', more: '+32' },
  { image: '/group-2.png', name: 'Clean City Initiative', members: '8.7k members', more: '+18' },
  { image: '/group-1.png', name: 'Sports Hub', members: '15.1k members', more: '+24' },
]

export const posts = [
  { avatar: '/avatar-2.png', name: 'Naledi Dube', meta: '@naledi.d · 18 min', body: 'The community garden is looking incredible. Huge thank you to everyone who came out this morning — this is what local action looks like.', image: '/post-1.png', likes: 128 },
  { avatar: '/avatar-1.png', name: 'Thabo Nkosi', meta: '@thabo.n · 1 hr', body: 'Small steps, meaningful change. Proud of what our neighbourhood can do together.', image: '/post-2.png', likes: 86 },
]

type IconName = 'home' | 'play' | 'message' | 'bell' | 'car' | 'search' | 'wallet' | 'file' | 'briefcase' | 'users' | 'user'
export const destinations: ReadonlyArray<{ id: NavId; label: string; icon: IconName; badge?: number }> = [
  { id: 'feed', label: 'Feed', icon: 'home' }, { id: 'videos', label: 'Videos', icon: 'play' }, { id: 'messages', label: 'Messages', icon: 'message' }, { id: 'notifications', label: 'Notifications', icon: 'bell' }, { id: 'taxis', label: 'Taxis', icon: 'car' }, { id: 'search', label: 'Search', icon: 'search' }, { id: 'funds', label: 'Funds', icon: 'wallet' }, { id: 'petitions', label: 'Petitions', icon: 'file' }, { id: 'jobs', label: 'Jobs', icon: 'briefcase' }, { id: 'groups', label: 'Groups', icon: 'users' }, { id: 'profile', label: 'Profile', icon: 'user' },
] as const
export const destinationLabel = (id: string) => destinations.find((item) => item.id === id)?.label ?? 'Netizen'
export const destinationIcon = (id: string) => destinations.find((item) => item.id === id)?.icon ?? 'users'
export const suggestedPeople = ['Thabo Nkosi', 'Amahle Zulu', 'Kabelo Molefe']
export const messageThreads = ['Lerato Khumalo', 'Community Group', 'Aisha Patel', 'Clean City Initiative']
export type Story = (typeof stories)[number]
export type Group = (typeof groups)[number]
export type Post = (typeof posts)[number]
export type Destination = (typeof destinations)[number]
