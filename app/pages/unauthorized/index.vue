<script setup lang="ts">
import { ShieldAlert } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const router = useRouter();
const { t } = useI18n();

const goBack = () => {
  router.back();
};

const goHome = () => {
  router.push('/');
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <Card class="max-w-md w-full">
      <CardHeader class="text-center">
        <div class="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldAlert class="h-8 w-8 text-destructive" />
        </div>
        <CardTitle class="text-2xl">{{ t('misc.unauthorized.title') }}</CardTitle>
        <CardDescription>
          {{ t('misc.unauthorized.description') }}
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <p class="text-sm text-muted-foreground text-center">
          {{ t('misc.unauthorized.body') }}
        </p>
        <div class="flex flex-wrap gap-2 justify-center">
          <Button variant="outline" @click="goBack">
            {{ t('misc.unauthorized.goBack') }}
          </Button>
          <Button @click="goHome">
            {{ t('misc.unauthorized.goHome') }}
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>