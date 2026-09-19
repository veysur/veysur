import {
  Type,
  Hash,
  Globe,
  Calendar,
  Clock,
  CalendarClock,
  SquareCheck,
  ChevronDown,
  RectangleHorizontal,
  ThumbsUp,
  Image,
  Star,
  Circle,
  List,
  Shuffle,
  LucideIcon,
  TextCursorInput,
  CircleDot,
  CalendarDays,
  Minus,
  Equal,
  Plus,
  LayoutGrid,
  Square,
  Columns2,
  GripVertical,
  Rows3,
} from 'lucide-react'
import {
  QUESTION_TYPE_TEXT,
  QUESTION_TYPE_NUMBER,
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_DROPDOWN,
  QUESTION_TYPE_BUTTON,
  QUESTION_TYPE_IMAGE_SELECT,
  QUESTION_TYPE_YES_NO,
  QUESTION_TYPE_STAR_RATING,
  QUESTION_TYPE_POINT_5,
  QUESTION_TYPE_POINT_10,
  QUESTION_TYPE_SURVEY_LANG_SELECT,
  QUESTION_TYPE_DATE,
  QUESTION_TYPE_TIME,
  QUESTION_TYPE_DATETIME,
  QUESTION_TYPE_MATRIX_COMPOSITE,
  QUESTION_TYPE_MATRIX_TEXT,
  QUESTION_TYPE_MATRIX_NUMBER,
  QUESTION_TYPE_MATRIX_DATE,
  QUESTION_TYPE_MATRIX_TIME,
  QUESTION_TYPE_MATRIX_DATETIME,
  QUESTION_TYPE_MATRIX_CHECKBOX,
  QUESTION_TYPE_MATRIX_YES_NO,
  QUESTION_TYPE_RANKING,
  QUESTION_TYPE_MULTI_PART_TEXT,
  QUESTION_TYPE_MULTI_PART_NUMBER,
  QUESTION_TYPE_MULTI_PART_YES_NO,
  QUESTION_TYPE_MULTI_PART_STAR_RATING,
  QUESTION_TYPE_MULTI_PART_POINT_5,
  QUESTION_TYPE_MULTI_PART_POINT_10,
  ATTRIBUTE_CHOICE_MIN_MAX,
  ATTRIBUTE_CHOICE_RANDOMISE,
  ATTRIBUTE_QUESTION_INPUT_SIZE,
  ATTRIBUTE_TEXT_INPUT_SIZE_SMALL,
  ATTRIBUTE_TEXT_INPUT_SIZE_MEDIUM,
  ATTRIBUTE_TEXT_INPUT_SIZE_LARGE,
  ATTRIBUTE_QUESTION_COLUMNS,
  ATTRIBUTE_COLUMNS_COUNT_2,
} from 'veysur-common'

/**
 * Configuration for question type categories shown in the Add Question modal.
 */
export type QuestionCategoryConfig = {
  id: string
  label: string
  description: string
  icon: LucideIcon
}

export const questionCategories: QuestionCategoryConfig[] = [
  {
    id: 'simple',
    label: 'Simple',
    description: 'Text and number inputs',
    icon: TextCursorInput,
  },
  {
    id: 'choice',
    label: 'Choice',
    description: 'Selection from options',
    icon: CircleDot,
  },
  {
    id: 'datetime',
    label: 'Date & Time',
    description: 'Date and time pickers',
    icon: CalendarDays,
  },
  {
    id: 'matrix',
    label: 'Matrix',
    description: 'Grid and matrix questions',
    icon: LayoutGrid,
  },
  {
    id: 'multiPart',
    label: 'Multi-Part',
    description: 'Questions made of independently-answered parts',
    icon: Rows3,
  },
]

/**
 * Configuration for question type cards shown in the Add Question modal.
 */
export type QuestionTypeOptionConfig = {
  type: string
  label: string
  icon: LucideIcon
  category: string
  // Optional label used to visually cluster related cards within a category
  subcategory?: string
}

export const questionTypeOptions: QuestionTypeOptionConfig[] = [
  { type: QUESTION_TYPE_TEXT, label: 'Text', icon: Type, category: 'simple' },
  {
    type: QUESTION_TYPE_NUMBER,
    label: 'Number',
    icon: Hash,
    category: 'simple',
  },
  {
    type: QUESTION_TYPE_CHECKBOX,
    label: 'Checkbox',
    icon: SquareCheck,
    category: 'choice',
    subcategory: 'Selection',
  },
  {
    type: QUESTION_TYPE_DROPDOWN,
    label: 'Dropdown',
    icon: ChevronDown,
    category: 'choice',
    subcategory: 'Selection',
  },
  {
    type: QUESTION_TYPE_BUTTON,
    label: 'Buttons',
    icon: RectangleHorizontal,
    category: 'choice',
    subcategory: 'Selection',
  },
  {
    type: QUESTION_TYPE_YES_NO,
    label: 'Yes/No',
    icon: ThumbsUp,
    category: 'choice',
    subcategory: 'Selection',
  },
  {
    type: QUESTION_TYPE_IMAGE_SELECT,
    label: 'Image Select',
    icon: Image,
    category: 'choice',
    subcategory: 'Selection',
  },
  {
    type: QUESTION_TYPE_STAR_RATING,
    label: 'Stars',
    icon: Star,
    category: 'choice',
    subcategory: 'Rating',
  },
  {
    type: QUESTION_TYPE_POINT_5,
    label: '5 Point',
    icon: Hash,
    category: 'choice',
    subcategory: 'Rating',
  },
  {
    type: QUESTION_TYPE_POINT_10,
    label: '10 Point',
    icon: Hash,
    category: 'choice',
    subcategory: 'Rating',
  },
  {
    type: QUESTION_TYPE_SURVEY_LANG_SELECT,
    label: 'Survey Language',
    icon: Globe,
    category: 'choice',
    subcategory: 'Other',
  },
  {
    type: QUESTION_TYPE_RANKING,
    label: 'Ranking',
    icon: GripVertical,
    category: 'choice',
    subcategory: 'Other',
  },
  {
    type: QUESTION_TYPE_DATE,
    label: 'Date',
    icon: Calendar,
    category: 'datetime',
  },
  {
    type: QUESTION_TYPE_TIME,
    label: 'Time',
    icon: Clock,
    category: 'datetime',
  },
  {
    type: QUESTION_TYPE_DATETIME,
    label: 'Date & Time',
    icon: CalendarClock,
    category: 'datetime',
  },
  {
    type: QUESTION_TYPE_MATRIX_TEXT,
    label: 'Matrix Text',
    icon: Type,
    category: 'matrix',
    subcategory: 'Simple',
  },
  {
    type: QUESTION_TYPE_MATRIX_NUMBER,
    label: 'Matrix Number',
    icon: Hash,
    category: 'matrix',
    subcategory: 'Simple',
  },
  {
    type: QUESTION_TYPE_MATRIX_DATE,
    label: 'Matrix Date',
    icon: Calendar,
    category: 'matrix',
    subcategory: 'Date & Time',
  },
  {
    type: QUESTION_TYPE_MATRIX_TIME,
    label: 'Matrix Time',
    icon: Clock,
    category: 'matrix',
    subcategory: 'Date & Time',
  },
  {
    type: QUESTION_TYPE_MATRIX_DATETIME,
    label: 'Matrix Date & Time',
    icon: CalendarClock,
    category: 'matrix',
    subcategory: 'Date & Time',
  },
  {
    type: QUESTION_TYPE_MATRIX_CHECKBOX,
    label: 'Matrix Checkbox',
    icon: SquareCheck,
    category: 'matrix',
    subcategory: 'Choice',
  },
  {
    type: QUESTION_TYPE_MATRIX_YES_NO,
    label: 'Matrix Yes/No',
    icon: ThumbsUp,
    category: 'matrix',
    subcategory: 'Choice',
  },
  {
    type: QUESTION_TYPE_MULTI_PART_TEXT,
    label: 'Multi-Part Text',
    icon: Type,
    category: 'multiPart',
    subcategory: 'Simple',
  },
  {
    type: QUESTION_TYPE_MULTI_PART_NUMBER,
    label: 'Multi-Part Number',
    icon: Hash,
    category: 'multiPart',
    subcategory: 'Simple',
  },
  {
    type: QUESTION_TYPE_MULTI_PART_YES_NO,
    label: 'Multi-Part Yes/No',
    icon: ThumbsUp,
    category: 'multiPart',
    subcategory: 'Selection',
  },
  {
    type: QUESTION_TYPE_MULTI_PART_STAR_RATING,
    label: 'Multi-Part Stars',
    icon: Star,
    category: 'multiPart',
    subcategory: 'Rating',
  },
  {
    type: QUESTION_TYPE_MULTI_PART_POINT_5,
    label: 'Multi-Part 5-Point',
    icon: Hash,
    category: 'multiPart',
    subcategory: 'Rating',
  },
  {
    type: QUESTION_TYPE_MULTI_PART_POINT_10,
    label: 'Multi-Part 10-Point',
    icon: Hash,
    category: 'multiPart',
    subcategory: 'Rating',
  },
]

/**
 * Configuration for attributes shown in the Add Question modal.
 * Only attributes explicitly listed here will appear - not all attributes for a type.
 */
export type QuestionAttributeOption = {
  value: string
  label: string
  attributeValue: string | number | boolean | { min: number; max: number } // The actual value to set on the attribute
  icon?: LucideIcon
}

export type QuestionAttributeConfig = {
  attributeId: string
  questionTypes: string[] // Which question types this attribute applies to
  label: string
  inputType: 'cards' | 'radio' | 'select' | 'checkbox'
  options: QuestionAttributeOption[]
  defaultOption: string
  // Whether to show this attribute in the Add Question modal
  showInAddModal?: boolean
}

export const questionAttributesConfig: QuestionAttributeConfig[] = [
  {
    attributeId: ATTRIBUTE_CHOICE_MIN_MAX,
    questionTypes: [
      QUESTION_TYPE_CHECKBOX,
      QUESTION_TYPE_DROPDOWN,
      QUESTION_TYPE_BUTTON,
      QUESTION_TYPE_IMAGE_SELECT,
    ],
    label: 'Selection Rules',
    inputType: 'cards',
    showInAddModal: true,
    options: [
      {
        value: 'single',
        label: 'Select one',
        attributeValue: { min: 0, max: 1 },
        icon: Circle,
      },
      {
        value: 'multiple',
        label: 'Select multiple',
        attributeValue: { min: 0, max: 0 },
        icon: List,
      },
    ],
    defaultOption: 'single',
  },
  {
    attributeId: ATTRIBUTE_QUESTION_INPUT_SIZE,
    questionTypes: [QUESTION_TYPE_TEXT],
    label: 'Input Size',
    inputType: 'cards',
    showInAddModal: false,
    options: [
      {
        value: ATTRIBUTE_TEXT_INPUT_SIZE_SMALL,
        label: 'Small',
        attributeValue: ATTRIBUTE_TEXT_INPUT_SIZE_SMALL,
        icon: Minus,
      },
      {
        value: ATTRIBUTE_TEXT_INPUT_SIZE_MEDIUM,
        label: 'Medium',
        attributeValue: ATTRIBUTE_TEXT_INPUT_SIZE_MEDIUM,
        icon: Equal,
      },
      {
        value: ATTRIBUTE_TEXT_INPUT_SIZE_LARGE,
        label: 'Large',
        attributeValue: ATTRIBUTE_TEXT_INPUT_SIZE_LARGE,
        icon: Plus,
      },
    ],
    defaultOption: ATTRIBUTE_TEXT_INPUT_SIZE_SMALL,
  },
  {
    attributeId: ATTRIBUTE_QUESTION_COLUMNS,
    questionTypes: [QUESTION_TYPE_IMAGE_SELECT],
    label: 'Columns',
    inputType: 'cards',
    showInAddModal: false,
    options: [
      { value: '1', label: '1', attributeValue: 1, icon: Square },
      { value: '2', label: '2', attributeValue: 2, icon: Columns2 },
      { value: '3', label: '3', attributeValue: 3, icon: LayoutGrid },
    ],
    defaultOption: String(ATTRIBUTE_COLUMNS_COUNT_2),
  },
  {
    attributeId: ATTRIBUTE_CHOICE_RANDOMISE,
    questionTypes: [
      QUESTION_TYPE_CHECKBOX,
      QUESTION_TYPE_DROPDOWN,
      QUESTION_TYPE_BUTTON,
      QUESTION_TYPE_IMAGE_SELECT,
      QUESTION_TYPE_MATRIX_COMPOSITE,
      QUESTION_TYPE_MATRIX_TEXT,
      QUESTION_TYPE_MATRIX_NUMBER,
      QUESTION_TYPE_MATRIX_DATE,
      QUESTION_TYPE_MATRIX_TIME,
      QUESTION_TYPE_MATRIX_DATETIME,
      QUESTION_TYPE_MATRIX_CHECKBOX,
      QUESTION_TYPE_MATRIX_YES_NO,
      QUESTION_TYPE_RANKING,
      QUESTION_TYPE_MULTI_PART_TEXT,
      QUESTION_TYPE_MULTI_PART_NUMBER,
      QUESTION_TYPE_MULTI_PART_YES_NO,
      QUESTION_TYPE_MULTI_PART_STAR_RATING,
      QUESTION_TYPE_MULTI_PART_POINT_5,
      QUESTION_TYPE_MULTI_PART_POINT_10,
    ],
    label: 'Randomise',
    inputType: 'cards',
    showInAddModal: false,
    options: [
      {
        value: 'no',
        label: 'Fixed order',
        attributeValue: false,
        icon: List,
      },
      {
        value: 'yes',
        label: 'Randomise',
        attributeValue: true,
        icon: Shuffle,
      },
    ],
    defaultOption: 'no',
  },
]
