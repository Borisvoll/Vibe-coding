import { mountWeeklyReview } from './view.js';

export function registerWeeklyReviewBlock(registry) {
  registry.register({
    id: 'weekly-review',
    title: 'Weekoverzicht',
    hosts: ['vandaag-weekly'],
    modes: [],  // All modes — always visible
    enabled: true,
    order: 90,  // Near bottom of today page
    mount(container, context) {
      return mountWeeklyReview(container, context);
    },
  });
}
