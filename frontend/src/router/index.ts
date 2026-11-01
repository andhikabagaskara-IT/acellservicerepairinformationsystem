import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { useCustomerStore } from '@/stores/customerStore';

const routes: RouteRecordRaw[] = [
  // ─── Public / Landing ─────────────────────────────────────────────────
  {
    path: '/',
    redirect: '/login',
  },

  // ─── Staff Auth ───────────────────────────────────────────────────────
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/auth/LoginPage.vue'),
    meta: { layout: 'auth', requiresAuth: false },
  },

  // ─── Admin Routes ─────────────────────────────────────────────────────
  {
    path: '/admin',
    meta: { layout: 'admin', requiresAuth: true, role: 'ADMIN' },
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: () => import('../views/admin/DashboardPage.vue'),
      },
      {
        path: 'tickets',
        name: 'AdminTickets',
        component: () => import('../views/admin/TicketsPage.vue'),
      },
      {
        path: 'tickets/new',
        name: 'AdminNewTicket',
        component: () => import('../views/admin/NewTicketPage.vue'),
      },
      {
        path: 'tickets/:id',
        name: 'AdminTicketDetail',
        component: () => import('../views/admin/TicketDetailPage.vue'),
        props: true,
      },
      {
        path: 'customers',
        name: 'AdminCustomers',
        component: () => import('../views/admin/CustomersPage.vue'),
      },
    ],
  },

  // ─── Technician Routes ────────────────────────────────────────────────
  {
    path: '/technician',
    meta: { layout: 'technician', requiresAuth: true, role: 'TECHNICIAN' },
    children: [
      {
        path: '',
        name: 'TechDashboard',
        component: () => import('../views/technician/DashboardPage.vue'),
      },
      {
        path: 'tickets/:id',
        name: 'TechTicketWorkspace',
        component: () => import('../views/technician/TicketWorkspacePage.vue'),
        props: true,
      },
      {
        path: 'queue',
        name: 'TechQueue',
        component: () => import('../views/technician/QueuePage.vue'),
      },
    ],
  },

  // ─── Customer Portal Routes ───────────────────────────────────────────
  {
    path: '/customer',
    meta: { layout: 'customer', requiresAuth: false },
    children: [
      {
        path: '',
        name: 'CustomerLogin',
        component: () => import('../views/customer/LoginPage.vue'),
      },
      {
        path: 'monitor',
        name: 'CustomerMonitor',
        component: () => import('../views/customer/MonitorPage.vue'),
        meta: { requiresCustomerSession: true },
      },
    ],
  },

  // ─── 404 Catch-All ────────────────────────────────────────────────────
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFoundPage.vue'),
    meta: { layout: 'auth' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition;
    return { top: 0 };
  },
});

// ─── Navigation Guards ──────────────────────────────────────────────────────
router.beforeEach(async (to, _from, next) => {
  // Determine effective meta (walk up matched routes)
  const requiresAuth = to.matched.some(r => r.meta.requiresAuth);
  const requiredRole = to.matched.find(r => r.meta.role)?.meta.role as string | undefined;
  const requiresCustomerSession = to.matched.some(r => r.meta.requiresCustomerSession);

  // Staff auth check
  if (requiresAuth) {
    const authStore = useAuthStore();

    // Initialize auth if not done yet
    if (authStore.isLoading) {
      await authStore.initializeAuth();
    }

    if (!authStore.isAuthenticated) {
      return next({ name: 'Login', query: { redirect: to.fullPath } });
    }

    // Role check
    if (requiredRole && authStore.userRole !== requiredRole) {
      // Redirect to appropriate dashboard
      if (authStore.isAdmin) return next({ name: 'AdminDashboard' });
      if (authStore.isTechnician) return next({ name: 'TechDashboard' });
      return next({ name: 'Login' });
    }
  }

  // Customer session check
  if (requiresCustomerSession) {
    const customerStore = useCustomerStore();
    if (!customerStore.isSessionActive) {
      const hasSession = await customerStore.checkSession();
      if (!hasSession) {
        return next({ name: 'CustomerLogin' });
      }
    }
  }

  // Redirect logged-in staff away from login page
  if (to.name === 'Login') {
    const authStore = useAuthStore();
    if (!authStore.isLoading && authStore.isAuthenticated) {
      if (authStore.isAdmin) return next({ name: 'AdminDashboard' });
      if (authStore.isTechnician) return next({ name: 'TechDashboard' });
    }
  }

  next();
});

export default router;
