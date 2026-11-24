export interface Interest {
  id: string;
  icon: string;
  label: string;
  topics: string[];
  areas: string[];
  industries?: string[];
  words?: RegExp;
  types?: string[];
}

export const INTERESTS: Interest[] = [
  { id: 'ai', icon: '🤖', label: 'Robots & AI', topics: ['Artificial Intelligence', 'Business Agents'], areas: ['Agentic AI', 'Generative AI', 'Machine Learning', 'Responsible AI'] },
  { id: 'security', icon: '🛡️', label: 'Security shields', topics: ['Security & Identity'], areas: ['Application Security', 'Identity & Access Management', 'DevSecOps', 'Threat Detection & Incident Response', 'Zero Trust', 'Data Protection', 'Network & Infrastructure Security', 'Cryptography and Post-Quantum', 'Culture of Security'] },
  { id: 'data', icon: '📊', label: 'Data detective', topics: ['Analytics', 'Databases', 'Storage'], areas: ['Business Intelligence', 'Open Data'] },
  { id: 'build', icon: '🛠️', label: 'App builder', topics: ['Developer Tools', 'Serverless', 'Containers', 'Application Integration'], areas: ['DevOps', 'Lambda-Based Applications', 'Event-Driven Architecture', 'Front-End Web & Mobile', 'Kubernetes'] },
  { id: 'cloud', icon: '☁️', label: 'Cloud architect', topics: ['Architecture', 'Compute', 'Networking & Content Delivery', 'Hybrid Cloud & Multicloud', 'Cloud Operations'], areas: ['Resilience', 'Well-Architected Framework', 'Global Infrastructure', 'Monitoring & Observability', 'Edge Computing'] },
  { id: 'money', icon: '💰', label: 'Save money & modernize', topics: ['Migration & Modernization'], areas: ['Cost Optimization', 'VMware', 'Microsoft & .NET', 'Innovation & Transformation', 'Management & Governance'] },
  { id: 'games', icon: '🎮', label: 'Games & media', topics: [], areas: [], industries: ['Games', 'Media & Entertainment', 'Sports'], words: /\bgam(e|es|ing)\b|stream/i },
  { id: 'business', icon: '💼', label: 'Business & industry', topics: ['Industry Solutions'], areas: ['Customer Enablement', 'Partner Enablement', 'SaaS', 'Tech for Impact'], industries: ['Financial Services', 'Healthcare & Life Sciences', 'Retail & Consumer Goods', 'Manufacturing & Industrial', 'Automotive', 'Telecommunications', 'Travel & Hospitality', 'Government', 'Education'] },
  { id: 'career', icon: '🎓', label: 'Learn & get certified', topics: [], areas: ['Training & Certification'], types: ['Exam prep', 'Bootcamp'] },
  { id: 'robots', icon: '🛰️', label: 'Space, robots & IoT', topics: [], areas: [], words: /\brobot|space|satellite|iot\b|drone|quantum/i },
];

export const HANDS_ON = new Set(['Workshop', "Builders' session", 'Lab', 'Code talk', 'Gamified learning', 'Bootcamp']);
export const TALKS = new Set(['Breakout session', 'Lightning talk', 'Chalk talk', 'Mainstage']);
