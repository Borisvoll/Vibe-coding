/**
 * BORIS OS — Block Loader
 * Registers all blocks into the registry.
 * To add a block: add a registerBlock() call.
 * To remove a block: delete the registerBlock() call and its folder.
 */

import { registerBlock } from './blockRegistry.js';

export function loadAllBlocks() {
  // =============================================
  // BPV MODE BLOCKS
  // =============================================

  registerBlock({
    id: 'bpv-today',
    mode: 'bpv',
    label: 'Vandaag',
    icon: 'clipboard-check',
    route: '',
    page: () => import('../pages/today.js'),
    nav: 'main',
    bottomNav: true,
    order: 1,
    stores: ['hours', 'logbook', 'dailyPlans', 'weekReviews', 'goals', 'competencies', 'quality', 'learningMoments', 'bpvLeerdoelen', 'bpvProducten', 'bpvReflecties', 'bpvBedrijf', 'assignments']
  });

  registerBlock({
    id: 'bpv-dashboard',
    mode: 'bpv',
    label: 'Dashboard',
    icon: 'dashboard',
    route: 'dashboard',
    page: () => import('../pages/dashboard.js'),
    nav: 'main',
    order: 2,
    stores: ['hours', 'logbook', 'goals', 'competencies', 'quality', 'dailyPlans', 'weekReviews']
  });

  registerBlock({
    id: 'bpv-planning',
    mode: 'bpv',
    label: 'Dagplan',
    icon: 'check-circle',
    route: 'planning',
    page: () => import('../pages/planning.js'),
    nav: 'main',
    bottomNav: true,
    order: 3,
    stores: ['dailyPlans', 'weekReviews']
  });

  registerBlock({
    id: 'bpv-hours',
    mode: 'bpv',
    label: 'Uren',
    icon: 'clock',
    route: 'hours',
    page: () => import('../pages/hours.js'),
    nav: 'main',
    bottomNav: true,
    order: 4,
    stores: ['hours'],
    extraRoutes: {
      'hours/:date': () => import('../pages/hours-entry.js')
    }
  });

  registerBlock({
    id: 'bpv-logbook',
    mode: 'bpv',
    label: 'Logboek',
    icon: 'book',
    route: 'logbook',
    page: () => import('../pages/logbook.js'),
    nav: 'main',
    bottomNav: true,
    order: 5,
    stores: ['logbook', 'photos'],
    extraRoutes: {
      'logbook/new': () => import('../pages/logbook-entry.js'),
      'logbook/:id': () => import('../pages/logbook-entry.js')
    }
  });

  registerBlock({
    id: 'bpv-notebook',
    mode: 'bpv',
    label: 'Notebook',
    icon: 'edit',
    route: 'notebook',
    page: () => import('../pages/notebook.js'),
    nav: 'main',
    order: 6,
    stores: []
  });

  registerBlock({
    id: 'bpv-opdrachten',
    mode: 'bpv',
    label: 'BPV Opdrachten',
    icon: 'clipboard',
    route: 'bpv-opdrachten',
    page: () => import('../pages/bpv-opdrachten.js'),
    nav: 'main',
    bottomNav: true,
    order: 7,
    stores: ['bpvLeerdoelen', 'bpvProducten', 'bpvReflecties', 'bpvBedrijf']
  });

  registerBlock({
    id: 'bpv-goals',
    mode: 'bpv',
    label: 'Leerdoelen',
    icon: 'target',
    route: 'goals',
    page: () => import('../pages/goals.js'),
    nav: 'main',
    order: 8,
    stores: ['goals']
  });

  registerBlock({
    id: 'bpv-competencies',
    mode: 'bpv',
    label: 'Leermeter',
    icon: 'chart',
    route: 'competencies',
    page: () => import('../pages/competencies.js'),
    nav: 'main',
    order: 9,
    stores: ['competencies']
  });

  registerBlock({
    id: 'bpv-quality',
    mode: 'bpv',
    label: 'Kwaliteit',
    icon: 'shield',
    route: 'quality',
    page: () => import('../pages/quality.js'),
    nav: 'main',
    order: 10,
    stores: ['quality']
  });

  registerBlock({
    id: 'bpv-learning',
    mode: 'bpv',
    label: 'Leeranalyse',
    icon: 'alert-triangle',
    route: 'learning-moments',
    page: () => import('../pages/learning-moments.js'),
    nav: 'main',
    order: 11,
    stores: ['learningMoments']
  });

  registerBlock({
    id: 'bpv-checklists',
    mode: 'bpv',
    label: 'Checklists',
    icon: 'clipboard-check',
    route: 'checklists',
    page: () => import('../pages/checklists.js'),
    nav: 'main',
    order: 12,
    stores: ['checklists', 'checklistLogs']
  });

  registerBlock({
    id: 'bpv-process-map',
    mode: 'bpv',
    label: 'Proceskaart',
    icon: 'map',
    route: 'process-map',
    page: () => import('../pages/process-map.js'),
    nav: 'main',
    order: 13,
    stores: []
  });

  registerBlock({
    id: 'bpv-reference',
    mode: 'bpv',
    label: 'Naslagwerk',
    icon: 'search',
    route: 'reference',
    page: () => import('../pages/reference.js'),
    nav: 'main',
    order: 14,
    stores: ['reference']
  });

  registerBlock({
    id: 'bpv-assignments',
    mode: 'bpv',
    label: 'Opdrachten (oud)',
    icon: 'clipboard',
    route: 'assignments',
    page: () => import('../pages/assignments.js'),
    nav: 'main',
    order: 15,
    stores: ['assignments']
  });

  registerBlock({
    id: 'bpv-report',
    mode: 'bpv',
    label: 'Verslag',
    icon: 'file-text',
    route: 'report',
    page: () => import('../pages/report.js'),
    nav: 'main',
    order: 16,
    stores: []
  });

  // =============================================
  // SCHOOL MODE BLOCKS
  // =============================================

  registerBlock({
    id: 'school-today',
    mode: 'school',
    label: 'Vandaag',
    icon: 'clipboard-check',
    route: '',
    page: () => import('../blocks/school-today/index.js'),
    nav: 'main',
    bottomNav: true,
    order: 1,
    stores: ['schoolTasks', 'schoolNotes', 'schoolProjects']
  });

  registerBlock({
    id: 'school-dashboard',
    mode: 'school',
    label: 'Dashboard',
    icon: 'dashboard',
    route: 'dashboard',
    page: () => import('../blocks/school-dashboard/index.js'),
    nav: 'main',
    order: 2,
    stores: ['schoolProjects', 'schoolSkills', 'schoolConcepts']
  });

  registerBlock({
    id: 'school-projects',
    mode: 'school',
    label: 'Projecten',
    icon: 'target',
    route: 'projects',
    page: () => import('../blocks/school-projects/index.js'),
    nav: 'main',
    bottomNav: true,
    order: 3,
    stores: ['schoolProjects']
  });

  registerBlock({
    id: 'school-planning',
    mode: 'school',
    label: 'Planning',
    icon: 'check-circle',
    route: 'school-planning',
    page: () => import('../blocks/school-planning/index.js'),
    nav: 'main',
    bottomNav: true,
    order: 4,
    stores: ['schoolMilestones', 'schoolTasks']
  });

  registerBlock({
    id: 'school-concepts',
    mode: 'school',
    label: 'Concept Vault',
    icon: 'book',
    route: 'concepts',
    page: () => import('../blocks/school-concepts/index.js'),
    nav: 'main',
    bottomNav: true,
    order: 5,
    stores: ['schoolConcepts']
  });

  registerBlock({
    id: 'school-skills',
    mode: 'school',
    label: 'Skills',
    icon: 'chart',
    route: 'skills',
    page: () => import('../blocks/school-skills/index.js'),
    nav: 'main',
    order: 6,
    stores: ['schoolSkills']
  });

  registerBlock({
    id: 'school-reflectie',
    mode: 'school',
    label: 'Reflectie',
    icon: 'edit',
    route: 'school-reflectie',
    page: () => import('../blocks/school-reflectie/index.js'),
    nav: 'main',
    bottomNav: true,
    order: 7,
    stores: ['schoolReflections']
  });

  // =============================================
  // PERSONAL MODE BLOCKS
  // =============================================

  registerBlock({
    id: 'personal-today',
    mode: 'personal',
    label: 'Vandaag',
    icon: 'clipboard-check',
    route: '',
    page: () => import('../blocks/personal-today/index.js'),
    nav: 'main',
    bottomNav: true,
    order: 1,
    stores: ['personalTasks', 'energy']
  });

  registerBlock({
    id: 'personal-dashboard',
    mode: 'personal',
    label: 'Dashboard',
    icon: 'dashboard',
    route: 'dashboard',
    page: () => import('../blocks/personal-dashboard/index.js'),
    nav: 'main',
    order: 2,
    stores: ['personalTasks', 'energy', 'personalGoals']
  });

  registerBlock({
    id: 'personal-planning',
    mode: 'personal',
    label: 'Planning',
    icon: 'check-circle',
    route: 'personal-planning',
    page: () => import('../blocks/personal-planning/index.js'),
    nav: 'main',
    bottomNav: true,
    order: 3,
    stores: ['personalTasks', 'personalGoals']
  });

  registerBlock({
    id: 'personal-reflectie',
    mode: 'personal',
    label: 'Reflectie',
    icon: 'edit',
    route: 'personal-reflectie',
    page: () => import('../blocks/personal-reflectie/index.js'),
    nav: 'main',
    bottomNav: true,
    order: 4,
    stores: ['personalReflections', 'energy']
  });

  // =============================================
  // SYSTEM BLOCKS (always available)
  // =============================================

  registerBlock({
    id: 'sync',
    mode: 'system',
    label: 'Sync',
    icon: 'upload',
    route: 'sync',
    page: () => import('../pages/sync.js'),
    nav: 'secondary',
    order: 90,
    stores: []
  });

  registerBlock({
    id: 'vault',
    mode: 'system',
    label: 'Vault',
    icon: 'lock',
    route: 'vault',
    page: () => import('../pages/vault.js'),
    nav: 'secondary',
    order: 91,
    stores: ['vault', 'vaultFiles']
  });

  registerBlock({
    id: 'export',
    mode: 'system',
    label: 'Export',
    icon: 'download',
    route: 'export',
    page: () => import('../pages/export.js'),
    nav: 'secondary',
    order: 92,
    stores: []
  });

  registerBlock({
    id: 'archief',
    mode: 'system',
    label: 'Archief',
    icon: 'list',
    route: 'archief',
    page: () => import('../blocks/archief/index.js'),
    nav: 'secondary',
    order: 93,
    stores: []
  });

  registerBlock({
    id: 'search',
    mode: 'system',
    label: 'Zoeken',
    icon: 'search',
    route: 'search',
    page: () => import('../blocks/search/index.js'),
    nav: 'secondary',
    order: 94,
    stores: []
  });

  registerBlock({
    id: 'settings',
    mode: 'system',
    label: 'Instellingen',
    icon: 'settings',
    route: 'settings',
    page: () => import('../pages/settings.js'),
    nav: 'secondary',
    order: 99,
    stores: ['settings']
  });
}
