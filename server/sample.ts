import type { Entry } from '../shared/model';
export const sampleStories = [
  {
    title: 'A more personal corner of the internet',
    content:
      'Small communities, independent blogs, and open protocols are making the web feel personal again. Start with the voices you trust, and build a feed that belongs to you.',
    author: 'The Open Web Journal',
    tags: ['Open web', 'Community'],
    url: 'https://example.com/open-web',
  },
  {
    title: 'Build a reading habit, one good source at a time',
    content:
      'The best reading list is the one you return to. A few thoughtful sources can be more useful than a hundred notifications. Give your curiosity a little room to wander.',
    author: 'Field Notes',
    tags: ['Reading', 'Ideas'],
    url: 'https://example.com/reading',
  },
  {
    title: 'Why independent publishing still matters',
    content:
      'A quiet look at the people writing for their communities, the tools they use, and the value of owning the relationship with their readers.',
    author: 'Independent Dispatch',
    tags: ['Publishing', 'Open web'],
    url: 'https://example.com/publishing',
  },
  {
    title: 'Your team conversations can become useful context',
    content:
      'Project updates often get buried in chat. Bring selected channels into a dedicated feed to keep the important ideas alongside your other sources.',
    author: 'Team Notebook',
    tags: ['Rocket.Chat', 'Work'],
    url: 'https://example.com/team',
  },
  {
    title: 'Notes on a slower, more intentional digital life',
    content:
      'Less scrolling, more reading. Try muting a topic, saving an article for later, and choosing what actually deserves your attention.',
    author: 'Sunday Letters',
    tags: ['Lifestyle', 'Reading'],
    url: 'https://example.com/slow',
  },
  {
    title: 'An introduction to the fediverse',
    content:
      'Communities can live on different servers and still talk to each other. Open standards make room for smaller spaces, independent moderation, and a wider range of voices.',
    author: 'Protocol Notes',
    tags: ['Fediverse', 'Technology'],
    url: 'https://example.com/fediverse',
  },
];
export const sampleUpdates: {
  externalId: string;
  type: NonNullable<Entry['type']>;
  title: string;
  content: string;
  author: string;
  authorHandle: string;
  tags: string[];
  minutesAgo: number;
  chat?: Entry['chat'];
}[] = [
  {
    externalId: 'sample-post-1',
    type: 'post',
    title: 'A web worth coming back to',
    content:
      'The most interesting part of the internet is still people sharing what they care about.\n\nA small blog. A thoughtful thread. A conversation that makes you see something differently. More of that, please.',
    author: 'Maya Chen',
    authorHandle: '@maya.example',
    tags: ['Open web'],
    minutesAgo: 8,
  },
  {
    externalId: 'sample-post-2',
    type: 'post',
    title: 'A little space for curiosity',
    content:
      'Trying something new: one place for the posts I follow, the articles I save, and the conversations I want to keep up with.\n\nTurns out a quieter feed can still have a lot to say.',
    author: 'Alex Rivera',
    authorHandle: '@alex.example',
    tags: ['Reading'],
    minutesAgo: 18,
  },
  {
    externalId: 'sample-chat-1',
    type: 'chat',
    title: 'Weekend reading picks',
    content:
      'What’s one good thing you read this week? I’m putting together a weekend reading list.',
    author: 'Sam Lee',
    authorHandle: 'sam',
    tags: ['Reading'],
    minutesAgo: 35,
    chat: { channelId: 'sample-reading', channelName: 'weekend-reading' },
  },
  {
    externalId: 'sample-chat-2',
    type: 'chat',
    title: 'A recommendation from Maya',
    content:
      'The piece on independent publishing. Especially the part about writing for a small community instead of chasing reach.',
    author: 'Maya Chen',
    authorHandle: 'maya',
    tags: ['Reading'],
    minutesAgo: 31,
    chat: {
      channelId: 'sample-reading',
      channelName: 'weekend-reading',
      threadId: 'sample-chat-1',
    },
  },
  {
    externalId: 'sample-chat-3',
    type: 'chat',
    title: 'A recommendation from Jules',
    content:
      'Adding that to my list. Also found a lovely essay on making the web feel personal again.',
    author: 'Jules Park',
    authorHandle: 'jules',
    tags: ['Reading'],
    minutesAgo: 27,
    chat: {
      channelId: 'sample-reading',
      channelName: 'weekend-reading',
      threadId: 'sample-chat-1',
    },
  },
  {
    externalId: 'sample-chat-4',
    type: 'chat',
    title: 'A quieter feed',
    content: 'Small improvement for today: fewer notifications, more time to actually read.',
    author: 'Alex Rivera',
    authorHandle: 'alex',
    tags: ['Community'],
    minutesAgo: 50,
    chat: { channelId: 'sample-general', channelName: 'general' },
  },
  {
    externalId: 'sample-chat-5',
    type: 'chat',
    title: 'Keep the conversation',
    content: 'Yes. Keep the conversations, lose the noise.',
    author: 'Sam Lee',
    authorHandle: 'sam',
    tags: ['Community'],
    minutesAgo: 45,
    chat: { channelId: 'sample-general', channelName: 'general' },
  },
];
