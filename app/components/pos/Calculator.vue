<script setup lang="ts">
import { Calculator as CalculatorIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const display = ref('0')
const leftOperand = ref<number | null>(null)
const operator = ref<string | null>(null)

const handleDigit = (digit: string) => {
  if (display.value === '0' && digit !== '.') {
    display.value = digit
  } else if (digit === '.' && !display.value.includes('.')) {
    display.value += digit
  } else if (digit !== '.') {
    display.value += digit
  }
}

const handleOperator = (op: string) => {
  const current = Number.parseFloat(display.value)
  if (leftOperand.value === null) {
    leftOperand.value = current
  } else if (operator.value) {
    const result = compute(leftOperand.value, current, operator.value)
    leftOperand.value = result
    display.value = result.toString()
  }
  operator.value = op
  display.value = '0'
}

const compute = (left: number, right: number, op: string): number => {
  switch (op) {
    case '+': return left + right
    case '−': return left - right
    case '×': return left * right
    case '÷': return right !== 0 ? left / right : 0
    case '%': return left * (right / 100)
    default: return right
  }
}

const handleEquals = () => {
  if (operator.value && leftOperand.value !== null) {
    const current = Number.parseFloat(display.value)
    const result = compute(leftOperand.value, current, operator.value)
    display.value = result.toString()
    leftOperand.value = null
    operator.value = null
  }
}

const handleClear = () => {
  display.value = '0'
  leftOperand.value = null
  operator.value = null
}

const handleBackspace = () => {
  if (display.value.length === 1) {
    display.value = '0'
  } else {
    display.value = display.value.slice(0, -1)
  }
}

const handlePercent = () => {
  const current = Number.parseFloat(display.value)
  display.value = (current / 100).toString()
}

const digits = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.']
const operators = [
  { symbol: '÷', label: '÷' },
  { symbol: '×', label: '×' },
  { symbol: '−', label: '−' },
  { symbol: '+', label: '+' },
]
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button variant="outline" size="icon">
        <CalculatorIcon />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-80 p-0">
      <Card class="border-0">
        <CardContent class="p-4 space-y-2">
          <div class="bg-muted rounded-lg p-3 text-right text-2xl font-mono font-semibold tabular-nums text-foreground overflow-hidden">
            {{ display }}
          </div>

          <div class="grid grid-cols-4 gap-2">
            <Button
              variant="ghost"
              class="col-span-2"
              @click="handleClear"
            >
              C
            </Button>
            <Button
              variant="ghost"
              @click="handleBackspace"
            >
              ←
            </Button>
            <Button
              variant="secondary"
              @click="handlePercent"
            >
              %
            </Button>

            <Button
              v-for="digit in digits.slice(0, 3)"
              :key="digit"
              variant="outline"
              @click="handleDigit(digit)"
            >
              {{ digit }}
            </Button>
            <Button
              variant="secondary"
              @click="handleOperator('÷')"
            >
              ÷
            </Button>

            <Button
              v-for="digit in digits.slice(3, 6)"
              :key="digit"
              variant="outline"
              @click="handleDigit(digit)"
            >
              {{ digit }}
            </Button>
            <Button
              variant="secondary"
              @click="handleOperator('×')"
            >
              ×
            </Button>

            <Button
              v-for="digit in digits.slice(6, 9)"
              :key="digit"
              variant="outline"
              @click="handleDigit(digit)"
            >
              {{ digit }}
            </Button>
            <Button
              variant="secondary"
              @click="handleOperator('−')"
            >
              −
            </Button>

            <Button
              v-for="digit in digits.slice(9)"
              :key="digit"
              variant="outline"
              @click="handleDigit(digit)"
            >
              {{ digit }}
            </Button>
            <Button
              variant="secondary"
              @click="handleOperator('+')"
            >
              +
            </Button>

            <Button
              variant="default"
              class="col-span-4"
              @click="handleEquals"
            >
              =
            </Button>
          </div>
        </CardContent>
      </Card>
    </PopoverContent>
  </Popover>
</template>
