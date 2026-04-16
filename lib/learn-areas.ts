export type LearnArea = {
  id: string
  title: string
  description: string
  color: string
  keyPoints: string[]
  resources: {
    canadaWide?: string
    provinceSpecific?: string
    cultural?: string
    templates?: string
  }
}

export const LEARN_AREAS: LearnArea[] = [
  {
    id: 'healthcare',
    title: 'Healthcare',
    description:
      'Plan for a time when you may not be able to make decisions about your care.',
    color: '#6B8E8D',
    keyPoints: [
      'Choosing a substitute decision maker',
      'Clarifying values and priorities',
      'Communicating wishes with loved ones and care providers',
    ],
    resources: {
      canadaWide: 'https://thenightside.net/resources',
      provinceSpecific: 'https://thenightside.net/resources',
    },
  },
  {
    id: 'deathcare',
    title: 'Deathcare & Body Disposition',
    description:
      'Consider burial, cremation, and other options for care of the body after death.',
    color: '#8E6B8D',
    keyPoints: [
      'Burial, cremation, and alternative methods',
      'Cultural, spiritual, and environmental considerations',
      'Provincial rules and availability',
    ],
    resources: {
      provinceSpecific: 'https://thenightside.net/resources',
    },
  },
  {
    id: 'wills',
    title: 'Wills & Estates',
    description:
      'Plan how your assets, responsibilities, and legal matters will be handled.',
    color: '#8D7A6B',
    keyPoints: [
      'Creating a valid will',
      'Naming an executor and beneficiaries',
      'Related estate planning tools',
    ],
    resources: {
      provinceSpecific: 'https://thenightside.net/resources',
    },
  },
  {
    id: 'legacy',
    title: 'Legacy Planning',
    description:
      'Think about how you want to be remembered and what you want to leave behind.',
    color: '#6B7A8D',
    keyPoints: [
      'Letters, messages, and memory projects',
      'Representation of identity and story',
      'Meaningful ways to express values',
    ],
    resources: {
      canadaWide: 'https://thenightside.net/resources',
    },
  },
  {
    id: 'admin',
    title: 'Personal Admin',
    description:
      'Organize practical information your loved ones will need to manage your affairs.',
    color: '#7A8D6B',
    keyPoints: [
      'Accounts, finances, and documents',
      'Digital assets and passwords',
      'Key contacts and access instructions',
    ],
    resources: {
      templates: 'https://thenightside.net/resources',
    },
  },
  {
    id: 'ritual',
    title: 'Ritual & Ceremony',
    description:
      'Define meaningful practices to honor life, death, and remembrance.',
    color: '#8D6B6B',
    keyPoints: [
      'Cultural and religious traditions',
      'Personal rituals and ceremonies',
      'Practices that support grief and connection',
    ],
    resources: {
      cultural: 'https://thenightside.net/resources',
    },
  },
]