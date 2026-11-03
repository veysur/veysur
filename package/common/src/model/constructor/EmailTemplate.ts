import { SchemaConstructor } from '@datacapy/schema'
import { SchemaEmailTemplate } from '../schema/SchemaEmailTemplate'

/** Fields come from {@link SchemaEmailTemplate}. */
export class EmailTemplate extends SchemaConstructor.from(
  SchemaEmailTemplate,
) {}
