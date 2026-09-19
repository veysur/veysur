import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  DayPicker,
  type DayPickerProps,
  type DropdownProps,
} from 'react-day-picker'

import { cn } from 'common/cn'
import { buttonVariants } from './button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'

export type CalendarProps = DayPickerProps

function CalendarDropdown({
  options,
  value,
  onChange,
  disabled,
  className,
  'aria-label': ariaLabel,
}: DropdownProps) {
  const handleValueChange = (newValue: string) => {
    onChange?.({
      target: { value: newValue },
    } as React.ChangeEvent<HTMLSelectElement>)
  }

  return (
    <Select
      value={value?.toString()}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn('h-7 w-fit gap-1 px-2 py-1 text-sm', className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options?.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value.toString()}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        month_caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium',
        dropdowns: 'flex justify-center gap-1',
        nav: 'space-x-1 flex items-center',
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1',
        ),
        month_grid: 'w-full border-collapse space-y-1',
        weekdays: 'flex',
        weekday:
          'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
        week: 'flex w-full mt-2',
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
        ),
        day_button: 'h-9 w-9 p-0 font-normal',
        selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        today: 'bg-accent text-accent-foreground',
        outside:
          'day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30',
        disabled: 'text-muted-foreground opacity-50',
        range_middle:
          'aria-selected:bg-accent aria-selected:text-accent-foreground',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
        Dropdown: CalendarDropdown,
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
