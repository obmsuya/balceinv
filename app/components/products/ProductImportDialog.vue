<script setup lang="ts">
import { CircleCheck, Download, FileSpreadsheet, TriangleAlert, Upload } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ProductImportResult } from '@/composables/useProducts'
import { ProductImportError, productImportLimitBytes } from '@/composables/useProducts'

const emit = defineEmits<{ imported: [] }>()

const open = defineModel<boolean>('open', { default: false })

const { importProducts, downloadTemplate, saving } = useProducts()

const pickedFile = ref<File | null>(null)
const fileInputKey = ref(0)
const importResult = ref<ProductImportResult | null>(null)
const rejectedResult = ref<ProductImportResult | null>(null)
const rejectionMessage = ref('')

const hiddenProblemCount = computed(() => {
  if (!rejectedResult.value) return 0
  return rejectedResult.value.problems_total - rejectedResult.value.problems.length
})

watch(open, isOpen => {
  if (!isOpen) return
  pickedFile.value = null
  fileInputKey.value++
  importResult.value = null
  rejectedResult.value = null
  rejectionMessage.value = ''
})

const onFilePicked = (event: Event) => {
  const chosenFile = (event.target as HTMLInputElement).files?.[0] ?? null
  importResult.value = null
  rejectedResult.value = null
  rejectionMessage.value = ''
  if (chosenFile && chosenFile.size > productImportLimitBytes) {
    toast.error('The file must be 5 MB or smaller')
    pickedFile.value = null
    fileInputKey.value++
    return
  }
  pickedFile.value = chosenFile
}

const runImport = async () => {
  if (!pickedFile.value) return
  try {
    importResult.value = await importProducts(pickedFile.value)
    pickedFile.value = null
    fileInputKey.value++
    emit('imported')
  } catch (error) {
    const importError = error as ProductImportError
    rejectionMessage.value = importError.message
    rejectedResult.value = importError instanceof ProductImportError ? importError.result : null
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Import products</DialogTitle>
        <DialogDescription>
          Upload an Excel (.xlsx) or CSV file. Nothing is saved unless every row is correct.
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <Label for="product-import-file">Spreadsheet</Label>
          <Input
            id="product-import-file"
            :key="fileInputKey"
            type="file"
            accept=".xlsx,.csv"
            @change="onFilePicked"
          />
        </div>
        <Button variant="outline" size="sm" class="self-start" type="button" @click="downloadTemplate">
          <Download />
          Download the template
        </Button>

        <div v-if="importResult" class="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
          <CircleCheck class="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <p>{{ importResult.created }} products added from {{ importResult.rows_read }} rows.</p>
        </div>

        <div v-if="rejectionMessage" class="flex flex-col gap-3">
          <div class="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <TriangleAlert class="mt-0.5 size-4 shrink-0 text-destructive" />
            <p>{{ rejectionMessage }}</p>
          </div>
          <div v-if="rejectedResult?.problems.length" class="max-h-64 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="w-16">Row</TableHead>
                  <TableHead class="w-28">Column</TableHead>
                  <TableHead>Problem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="(problem, problemIndex) in rejectedResult.problems" :key="problemIndex">
                  <TableCell class="tabular-nums">{{ problem.row || '—' }}</TableCell>
                  <TableCell class="font-mono text-xs">{{ problem.column || '—' }}</TableCell>
                  <TableCell>{{ problem.problem }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p v-if="hiddenProblemCount > 0" class="text-xs text-muted-foreground">
            And {{ hiddenProblemCount }} more. Fix these first, then upload again.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="open = false">{{ importResult ? 'Done' : 'Cancel' }}</Button>
        <Button :disabled="!pickedFile || saving" @click="runImport">
          <FileSpreadsheet v-if="!saving" />
          <Upload v-else class="animate-pulse" />
          Import
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
