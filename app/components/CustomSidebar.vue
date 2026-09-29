<script setup lang="ts">
import {
  CreditCard,
  ShoppingCart,
  Package,
  Users,
  Shield,
  Bell,
  Settings,
  Boxes,
  FileText,
  BadgePercent,
  Store,
  LayoutDashboard
} from 'lucide-vue-next';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '~/composables/useAuth';
import { usePermissions } from '~/composables/usePermissions';
import { isPortedRoute } from '~/utils/portedRoutes';

interface NavigationItem {
  path: string;
  icon: any;
  label: string;
  resource: string;
  badge?: number;
}

const route = useRoute();
const sidebarCollapsed = useState('sidebar-collapsed', () => false);

const { user, logout } = useAuth();
const { canView } = usePermissions();
const { isCloud, fetchPlatform } = usePlatform();

onMounted(fetchPlatform);

const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

watch(() => route.path, () => {
  const isPhoneWidth = window.matchMedia('(max-width: 767px)').matches;
  if (isPhoneWidth) sidebarCollapsed.value = true;
});

const isActive = (path: string): boolean => {
  return route.path === path || route.path.startsWith(path + '/');
};

const navigationItems = computed(() => {
  const operations: NavigationItem[] = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', resource: 'reports' },
    { path: '/pos', icon: CreditCard, label: 'Point of Sale', resource: 'sales' },
    { path: '/sales', icon: ShoppingCart, label: 'Sales History', resource: 'sales' },
    { path: '/products', icon: Package, label: 'Products', resource: 'products' },
    { path: '/stock', icon: Boxes, label: 'Stock', resource: 'stock_movements' },
    { path: '/discounts', icon: BadgePercent, label: 'Discounts', resource: 'discounts' },
  ];

  const management: NavigationItem[] = [
    { path: '/reports', icon: FileText, label: 'Reports', resource: 'reports' },
    { path: '/notifications', icon: Bell, label: 'Notifications', resource: 'notifications' },
  ];

  const admin: NavigationItem[] = [
    { path: '/shops', icon: Store, label: 'Shops', resource: 'shops' },
    { path: '/users', icon: Users, label: 'Users', resource: 'users' },
    { path: '/roles', icon: Shield, label: 'Roles', resource: 'roles' },
    { path: '/settings', icon: Settings, label: 'Settings', resource: 'settings' },
  ];

  const isVisible = (item: NavigationItem) => {
    const isCloudOnly = item.path === '/shops';
    if (isCloudOnly && !isCloud.value) return false;
    return isPortedRoute(item.path) && canView(item.resource);
  };

  return {
    operations: operations.filter(isVisible),
    management: management.filter(isVisible),
    admin: admin.filter(isVisible),
  };
});
</script>

<template>
  <aside
    :class="[
      'fixed left-0 top-16 bottom-0 border-r bg-background transition-all duration-200 z-40',
      sidebarCollapsed ? 'w-16 -translate-x-full md:translate-x-0' : 'w-64 shadow-lg md:shadow-none'
    ]"
  >
    <div class="flex flex-col h-full p-3">
      <div class="flex-1 space-y-4">
        <div v-if="navigationItems.operations.length > 0">
          <p v-if="!sidebarCollapsed" class="text-xs font-semibold text-muted-foreground px-3 mb-2">OPERATIONS</p>
          <NuxtLink
            v-for="item in navigationItems.operations"
            :key="item.path"
            :to="item.path"
            :class="[
              'w-full flex items-center rounded-md hover:bg-accent transition-colors h-10',
              sidebarCollapsed ? 'justify-center px-2' : 'justify-start px-3',
              isActive(item.path) ? 'bg-accent' : ''
            ]"
          >
            <component :is="item.icon" class="h-4 w-4 shrink-0" :class="{ 'mr-3': !sidebarCollapsed }" />
            <span v-if="!sidebarCollapsed" class="text-sm font-medium">{{ item.label }}</span>
            <Badge v-if="item.badge && !sidebarCollapsed" variant="destructive" class="ml-auto">{{ item.badge }}</Badge>
          </NuxtLink>
        </div>

        <Separator v-if="navigationItems.management.length > 0" />

        <div v-if="navigationItems.management.length > 0">
          <p v-if="!sidebarCollapsed" class="text-xs font-semibold text-muted-foreground px-3 mb-2">MANAGEMENT</p>
          <NuxtLink
            v-for="item in navigationItems.management"
            :key="item.path"
            :to="item.path"
            :class="[
              'w-full flex items-center rounded-md hover:bg-accent transition-colors h-10',
              sidebarCollapsed ? 'justify-center px-2' : 'justify-start px-3',
              isActive(item.path) ? 'bg-accent' : ''
            ]"
          >
            <component :is="item.icon" class="h-4 w-4 shrink-0" :class="{ 'mr-3': !sidebarCollapsed }" />
            <span v-if="!sidebarCollapsed" class="text-sm font-medium">{{ item.label }}</span>
          </NuxtLink>
        </div>

        <Separator v-if="navigationItems.admin.length > 0" />

        <div v-if="navigationItems.admin.length > 0">
          <p v-if="!sidebarCollapsed" class="text-xs font-semibold text-muted-foreground px-3 mb-2">ADMIN</p>
          <NuxtLink
            v-for="item in navigationItems.admin"
            :key="item.path"
            :to="item.path"
            :class="[
              'w-full flex items-center rounded-md hover:bg-accent transition-colors h-10',
              sidebarCollapsed ? 'justify-center px-2' : 'justify-start px-3',
              isActive(item.path) ? 'bg-accent' : ''
            ]"
          >
            <component :is="item.icon" class="h-4 w-4 shrink-0" :class="{ 'mr-3': !sidebarCollapsed }" />
            <span v-if="!sidebarCollapsed" class="text-sm font-medium">{{ item.label }}</span>
          </NuxtLink>
        </div>
      </div>

      <div class="pt-3 border-t">
        <div v-if="!sidebarCollapsed" class="flex items-center gap-3 px-3 py-2">
          <Avatar class="h-8 w-8">
            <AvatarFallback class="text-xs">{{ user ? getInitials(user.name) : '?' }}</AvatarFallback>
          </Avatar>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ user?.name }}</p>
            <p class="text-xs text-muted-foreground truncate">{{ user?.role }}</p>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>